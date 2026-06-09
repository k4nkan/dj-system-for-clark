import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

loadEnvFile();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
const configuredPlaylistId = process.env.SPOTIFY_PLAYLIST_ID;

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  assertEnv("SPOTIFY_CLIENT_ID", clientId);
  assertEnv("SPOTIFY_CLIENT_SECRET", clientSecret);
  assertEnv("SPOTIFY_REFRESH_TOKEN", refreshToken);

  const token = await getUserAccessToken();
  const playlists = await getPlaylists(token.accessToken);

  if (token.scope) {
    console.log(`Scopes: ${token.scope}`);
    printScopeWarnings(token.scope);
    console.log("");
  }

  console.log(`Playlists: ${playlists.length}`);

  if (playlists.length === 0) {
    console.log("No playlists returned from Spotify.");
    return;
  }

  for (const playlist of playlists) {
    const marker =
      configuredPlaylistId && playlist.id === configuredPlaylistId
        ? " [SPOTIFY_PLAYLIST_ID]"
        : "";

    console.log(`- ${playlist.name}${marker}`);
    console.log(`  id: ${playlist.id}`);
    console.log(`  owner: ${playlist.owner?.display_name || playlist.owner?.id || "-"}`);
    console.log(`  public: ${playlist.public}`);
    console.log(`  tracks: ${playlist.tracks?.total ?? "-"}`);
    console.log("");
  }

  if (
    configuredPlaylistId &&
    !playlists.some((playlist) => playlist.id === configuredPlaylistId)
  ) {
    console.warn(
      "SPOTIFY_PLAYLIST_ID was not found in this user's returned playlists.",
    );
    console.warn(
      "If the playlist is private or collaborative, the refresh token may need playlist-read-private or playlist-read-collaborative scope.",
    );
  }
}

async function getUserAccessToken() {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Spotify token request failed (${response.status}): ${
        data?.error_description || data?.error || "Unknown error"
      }`,
    );
  }

  return {
    accessToken: data.access_token,
    scope: data.scope || "",
  };
}

async function getPlaylists(accessToken) {
  const playlists = [];
  let nextUrl = "https://api.spotify.com/v1/me/playlists?limit=50";

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        `Spotify playlists request failed (${response.status}): ${
          data?.error?.message || data?.error || "Unknown error"
        }`,
      );
    }

    playlists.push(...(data.items || []));
    nextUrl = data.next;
  }

  return playlists;
}

function assertEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
}

function printScopeWarnings(scope) {
  const scopes = new Set(scope.split(/\s+/).filter(Boolean));
  const canModifyPlaylist =
    scopes.has("playlist-modify-public") ||
    scopes.has("playlist-modify-private");

  if (!canModifyPlaylist) {
    console.warn(
      "Warning: playlist-modify-public or playlist-modify-private scope is missing.",
    );
  }

  if (
    !scopes.has("playlist-read-private") &&
    !scopes.has("playlist-read-collaborative")
  ) {
    console.warn(
      "Warning: private or collaborative playlists may not be returned.",
    );
  }
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
