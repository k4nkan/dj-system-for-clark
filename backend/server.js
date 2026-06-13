import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const spotifyApiBase = "https://api.spotify.com/v1";

loadEnvFile();

const config = {
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 3000),
  mentorPassword: process.env.MENTOR_PASSWORD,
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    market: process.env.SPOTIFY_MARKET || "JP",
    playlistId: process.env.SPOTIFY_PLAYLIST_ID,
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
  },
};

const tokenCache = {
  client: { value: null, expiresAt: 0 },
  user: { value: null, expiresAt: 0 },
};

createServer(handleRequest).listen(config.port, config.host, () => {
  console.log(`Server running at http://${config.host}:${config.port}`);
});

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/search") {
      await handleSearch(url, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/requests") {
      await handlePlaylistAdd(req, res);
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
}

async function handleSearch(url, res) {
  if (!ensureEnv(res, ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"])) {
    return;
  }

  const query = (url.searchParams.get("q") || "").trim();

  if (!query) {
    sendJson(res, 400, { error: "q is required" });
    return;
  }

  const tracks = await searchSpotifyTracks(query);
  sendJson(res, 200, { tracks });
}

async function handlePlaylistAdd(req, res) {
  if (
    !ensureEnv(res, [
      "SPOTIFY_CLIENT_ID",
      "SPOTIFY_CLIENT_SECRET",
      "SPOTIFY_PLAYLIST_ID",
      "SPOTIFY_REFRESH_TOKEN",
      "MENTOR_PASSWORD",
    ])
  ) {
    return;
  }

  const body = await readJsonBody(req);
  const mentorPassword = String(body.mentorPassword || "");
  const trackUri = String(body.trackUri || "").trim();

  if (mentorPassword !== config.mentorPassword) {
    sendJson(res, 401, { error: "Invalid password" });
    return;
  }

  if (!trackUri.startsWith("spotify:track:")) {
    sendJson(res, 400, { error: "Select a track" });
    return;
  }

  try {
    await addTrackToPlaylist(trackUri);
  } catch (error) {
    console.error("Failed to add track to Spotify playlist", error);
    sendJson(res, 502, { error: getSpotifyErrorMessage(error) });
    return;
  }

  sendJson(res, 201, { ok: true });
}

async function searchSpotifyTracks(query) {
  const token = await getClientAccessToken();
  const url = new URL(`${spotifyApiBase}/search`);
  url.searchParams.set("type", "track");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "30");
  url.searchParams.set("market", config.spotify.market);

  const data = await spotifyJson(url, token);
  return (data.tracks?.items || []).map(normalizeSpotifyTrack);
}

async function addTrackToPlaylist(trackUri) {
  const token = await getUserAccessToken();
  const url = `${spotifyApiBase}/playlists/${config.spotify.playlistId}/tracks`;

  await spotifyJson(url, token, {
    method: "POST",
    body: JSON.stringify({ uris: [trackUri] }),
  });
}

async function spotifyJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.error_description ||
        "Spotify request failed",
    );
  }

  return data;
}

async function getClientAccessToken() {
  return getSpotifyAccessToken(
    tokenCache.client,
    new URLSearchParams({ grant_type: "client_credentials" }),
  );
}

async function getUserAccessToken() {
  return getSpotifyAccessToken(
    tokenCache.user,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.spotify.refreshToken,
    }),
  );
}

async function getSpotifyAccessToken(cache, body) {
  const now = Date.now();

  if (cache.value && now < cache.expiresAt) {
    return cache.value;
  }

  const credentials = Buffer.from(
    `${config.spotify.clientId}:${config.spotify.clientSecret}`,
  ).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error_description || "Spotify token request failed");
  }

  cache.value = data.access_token;
  cache.expiresAt = now + Math.max(0, data.expires_in - 60) * 1000;

  return cache.value;
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
      ".svg": "image/svg+xml",
    }[ext] || "application/octet-stream";

  res.writeHead(200, { "Content-Type": contentType });
  res.end(body);
}

async function readJsonBody(req) {
  let body = "";

  for await (const chunk of req) {
    body += chunk;

    if (body.length > 1024 * 1024) {
      throw new Error("Request body too large");
    }
  }

  return body ? JSON.parse(body) : {};
}

function ensureEnv(res, names) {
  const values = {
    SPOTIFY_CLIENT_ID: config.spotify.clientId,
    SPOTIFY_CLIENT_SECRET: config.spotify.clientSecret,
    SPOTIFY_PLAYLIST_ID: config.spotify.playlistId,
    SPOTIFY_REFRESH_TOKEN: config.spotify.refreshToken,
    MENTOR_PASSWORD: config.mentorPassword,
  };
  const missing = names.filter((name) => !values[name]);

  if (missing.length === 0) {
    return true;
  }

  sendJson(res, 500, { error: `${missing.join(" and ")} are required` });
  return false;
}

function getSpotifyErrorMessage(error) {
  const message = String(error?.message || "");

  if (/invalid refresh token|invalid_grant/i.test(message)) {
    return "Invalid Spotify refresh token";
  }

  if (/insufficient.*scope|scope/i.test(message)) {
    return "Spotify token is missing playlist scope";
  }

  return "Failed to add track to Spotify playlist";
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
