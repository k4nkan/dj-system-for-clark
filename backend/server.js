import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");

loadEnvFile();

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const market = process.env.SPOTIFY_MARKET || "JP";
const mentorPassword = process.env.MENTOR_PASSWORD;
const playlistId = process.env.SPOTIFY_PLAYLIST_ID;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
const maxDurationMs = Number(process.env.MAX_DURATION_MS || 420000);
const allowExplicit = process.env.ALLOW_EXPLICIT === "true";

let cachedClientToken = null;
let clientTokenExpiresAt = 0;
let cachedUserToken = null;
let userTokenExpiresAt = 0;
const rateLimitMap = new Map();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname === "/api/search" && req.method === "GET") {
      await handleSearch(url, res);
      return;
    }

    if (url.pathname === "/api/requests" && req.method === "POST") {
      await handleCreateRequest(req, res);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    await serveFrontend(url.pathname, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Server error" });
  }
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});

async function handleSearch(url, res) {
  if (!clientId || !clientSecret) {
    sendJson(res, 500, {
      error: "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required",
    });
    return;
  }

  const q = (url.searchParams.get("q") || "").trim();

  if (!q) {
    sendJson(res, 400, { error: "q is required" });
    return;
  }

  const token = await getClientAccessToken();
  const spotifyUrl = new URL("https://api.spotify.com/v1/search");
  spotifyUrl.searchParams.set("type", "track");
  spotifyUrl.searchParams.set("q", q);
  spotifyUrl.searchParams.set("limit", "12");
  spotifyUrl.searchParams.set("market", market);

  const response = await fetch(spotifyUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    sendJson(res, response.status, {
      error: data?.error?.message || "Spotify search failed",
    });
    return;
  }

  const tracks = (data.tracks?.items || []).map(normalizeSpotifyTrack);

  sendJson(res, 200, { tracks });
}

async function handleCreateRequest(req, res) {
  if (!clientId || !clientSecret) {
    sendJson(res, 500, {
      error: "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required",
    });
    return;
  }

  if (!playlistId || !refreshToken) {
    sendJson(res, 500, {
      error: "SPOTIFY_PLAYLIST_ID and SPOTIFY_REFRESH_TOKEN are required",
    });
    return;
  }

  if (!mentorPassword) {
    sendJson(res, 500, { error: "MENTOR_PASSWORD is required" });
    return;
  }

  if (!checkRateLimit(req)) {
    sendJson(res, 429, {
      error: "リクエストが多すぎます。少し待ってください。",
    });
    return;
  }

  const body = await readJsonBody(req);
  const password = String(body.mentorPassword || "");
  const trackId = String(body.trackId || "").trim();

  if (password !== mentorPassword) {
    sendJson(res, 401, { error: "メンターパスワードが違います" });
    return;
  }

  if (!trackId) {
    sendJson(res, 400, { error: "曲を選んでください" });
    return;
  }

  const track = await getSpotifyTrack(trackId);

  if (track.durationMs > maxDurationMs) {
    sendJson(res, 400, { error: "7分以上の曲はリクエストできません" });
    return;
  }

  if (!allowExplicit && track.explicit) {
    sendJson(res, 400, { error: "Explicit曲はリクエストできません" });
    return;
  }

  try {
    await addTrackToPlaylist(track.uri);
  } catch (error) {
    console.error("Failed to add track to Spotify playlist", error);
    sendJson(res, 502, { error: "Spotifyプレイリスト追加に失敗しました" });
    return;
  }

  sendJson(res, 201, { track });
}

async function getSpotifyTrack(trackId) {
  const token = await getClientAccessToken();
  const spotifyUrl = new URL(`https://api.spotify.com/v1/tracks/${trackId}`);
  spotifyUrl.searchParams.set("market", market);

  const response = await fetch(spotifyUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Spotify track request failed");
  }

  return normalizeSpotifyTrack(data);
}

async function addTrackToPlaylist(trackUri) {
  const token = await getUserAccessToken();
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [trackUri] }),
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || "Spotify playlist add failed");
  }
}

async function getClientAccessToken() {
  return getSpotifyAccessToken({
    cachedToken: cachedClientToken,
    expiresAt: clientTokenExpiresAt,
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    onToken: (token, expiresAt) => {
      cachedClientToken = token;
      clientTokenExpiresAt = expiresAt;
    },
  });
}

async function getUserAccessToken() {
  return getSpotifyAccessToken({
    cachedToken: cachedUserToken,
    expiresAt: userTokenExpiresAt,
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    onToken: (token, expiresAt) => {
      cachedUserToken = token;
      userTokenExpiresAt = expiresAt;
    },
  });
}

async function getSpotifyAccessToken({
  cachedToken,
  expiresAt,
  body,
  onToken,
}) {
  const now = Date.now();

  if (cachedToken && now < expiresAt) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error_description || "Spotify token request failed");
  }

  const expiresAtNext = now + Math.max(0, data.expires_in - 60) * 1000;
  onToken(data.access_token, expiresAtNext);

  return data.access_token;
}

function normalizeSpotifyTrack(track) {
  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: track.artists.map((artist) => artist.name).join(", "),
    album: track.album?.name || "",
    image: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || "",
    durationMs: track.duration_ms,
    explicit: Boolean(track.explicit),
  };
}

async function readJsonBody(req) {
  let body = "";

  for await (const chunk of req) {
    body += chunk;

    if (body.length > 1024 * 1024) {
      throw new Error("Request body too large");
    }
  }

  if (!body) {
    return {};
  }

  return JSON.parse(body);
}

async function serveFrontend(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(frontendDir, safePath));

  if (
    !filePath.startsWith(`${frontendDir}${path.sep}`) ||
    !existsSync(filePath)
  ) {
    sendText(res, 404, "Not found");
    return;
  }

  const body = await readFile(filePath);
  const ext = path.extname(filePath);
  const contentType =
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
    }[ext] || "application/octet-stream";

  res.writeHead(200, { "Content-Type": contentType });
  res.end(body);
}

function checkRateLimit(req) {
  const limit = Number(process.env.REQUESTS_PER_MINUTE || 20);
  const ip = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const current = rateLimitMap.get(ip) || [];
  const recent = current.filter((time) => now - time < 60000);

  if (recent.length >= limit) {
    rateLimitMap.set(ip, recent);
    return false;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function sendText(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

function loadEnvFile() {
  const envPath = path.join(rootDir, ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const body = readFileSync(envPath, "utf8");

  for (const line of body.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
