import { apiError } from "./http.js";

const spotifyApiBase = "https://api.spotify.com/v1";
const tokenCache = {
  client: { value: null, expiresAt: 0 },
  user: { value: null, expiresAt: 0 },
};

export async function searchTracks(query) {
  requireEnv(["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"]);

  const url = new URL(`${spotifyApiBase}/search`);
  url.searchParams.set("type", "track");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "10");
  url.searchParams.set("market", process.env.SPOTIFY_MARKET || "JP");

  const data = await spotifyJson(url, await getClientAccessToken());
  return (data.tracks?.items || []).map(normalizeTrack);
}

export async function addTrackToPlaylist(trackUri) {
  requireEnv([
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_REFRESH_TOKEN",
    "SPOTIFY_PLAYLIST_ID",
  ]);

  const url = `${spotifyApiBase}/playlists/${process.env.SPOTIFY_PLAYLIST_ID}/items`;
  await spotifyJson(url, await getUserAccessToken(), {
    method: "POST",
    body: JSON.stringify({ uris: [trackUri] }),
  });
}

export async function getNowPlaying() {
  requireUserEnv();

  const response = await spotifyFetch(
    `${spotifyApiBase}/me/player/currently-playing`,
    await getUserAccessToken(),
  );

  if (response.status === 204) {
    return null;
  }

  const data = await readSpotifyResponse(response);
  const track = data.item?.type === "track" ? normalizeTrack(data.item) : null;

  return track
    ? {
        ...track,
        isPlaying: Boolean(data.is_playing),
        progressMs: data.progress_ms || 0,
      }
    : null;
}

export async function getPlaylist() {
  requireUserEnv();

  const playlistId = process.env.SPOTIFY_PLAYLIST_ID;
  const token = await getUserAccessToken();
  const [playlist, contents] = await Promise.all([
    spotifyJson(`${spotifyApiBase}/playlists/${playlistId}`, token),
    spotifyJson(
      `${spotifyApiBase}/playlists/${playlistId}/items?limit=50`,
      token,
    ),
  ]);

  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description || "",
    image: playlist.images?.[0]?.url || "",
    spotifyUrl: playlist.external_urls?.spotify || "",
    owner: playlist.owner?.display_name || "",
    total: contents.total || 0,
    tracks: (contents.items || [])
      .map((entry) => entry.item || entry.track)
      .filter((item) => item?.type === "track")
      .map(normalizeTrack),
  };
}

function normalizeTrack(track) {
  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: (track.artists || []).map((artist) => artist.name).join(", "),
    album: track.album?.name || "",
    image: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || "",
    durationMs: track.duration_ms || 0,
    explicit: Boolean(track.explicit),
    spotifyUrl: track.external_urls?.spotify || "",
  };
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
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
  );
}

async function getSpotifyAccessToken(cache, body) {
  if (cache.value && Date.now() < cache.expiresAt) {
    return cache.value;
  }

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
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
    throw apiError(502, data.error_description || "Spotify token request failed");
  }

  cache.value = data.access_token;
  cache.expiresAt = Date.now() + Math.max(0, data.expires_in - 60) * 1000;
  return cache.value;
}

async function spotifyJson(url, token, options) {
  const response = await spotifyFetch(url, token, options);
  return readSpotifyResponse(response);
}

async function spotifyFetch(url, token, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

async function readSpotifyResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw apiError(
      response.status === 429 ? 429 : 502,
      data?.error?.message || data?.error_description || "Spotify request failed",
    );
  }

  return data;
}

function requireUserEnv() {
  requireEnv([
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_REFRESH_TOKEN",
    "SPOTIFY_PLAYLIST_ID",
  ]);
}

function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw apiError(500, `${missing.join(" and ")} are required`);
  }
}
