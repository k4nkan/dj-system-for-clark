import { existsSync, readFileSync } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const scopes = [
  "playlist-modify-public",
  "playlist-modify-private",
  "playlist-read-private",
  "playlist-read-collaborative",
];

loadEnvFile();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri =
  process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/callback";
const codeArg = process.argv[2];

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  assertEnv("SPOTIFY_CLIENT_ID", clientId);

  if (!codeArg) {
    printAuthorizeUrl();
    return;
  }

  assertEnv("SPOTIFY_CLIENT_SECRET", clientSecret);
  await exchangeCode(extractCode(codeArg));
}

function printAuthorizeUrl() {
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", crypto.randomBytes(16).toString("hex"));

  console.log("1. Add this Redirect URI in the Spotify app settings:");
  console.log(redirectUri);
  console.log("");
  console.log("2. Open this URL and approve access:");
  console.log(url.toString());
  console.log("");
  console.log("3. After redirect, copy the full URL or code and run:");
  console.log("node scripts/get-spotify-refresh-token.js \"PASTE_CODE_OR_URL\"");
}

async function exchangeCode(code) {
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
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Spotify code exchange failed (${response.status}): ${
        data?.error_description || data?.error || "Unknown error"
      }`,
    );
  }

  console.log("SPOTIFY_REFRESH_TOKEN=");
  console.log(data.refresh_token || "(no refresh token returned)");
  console.log("");
  console.log("Scopes:");
  console.log(data.scope || "(no scope returned)");
}

function extractCode(value) {
  if (!value) {
    throw new Error("Authorization code is required");
  }

  try {
    const url = new URL(value);
    const code = url.searchParams.get("code");

    if (code) {
      return code;
    }
  } catch {
    return value;
  }

  return value;
}

function assertEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required`);
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
