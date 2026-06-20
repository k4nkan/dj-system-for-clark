import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const spotifyAccountsBase = "https://accounts.spotify.com";
const defaultRedirectUri = "http://127.0.0.1:8888/callback";
const defaultScopes = "playlist-modify-public playlist-modify-private";

loadEnvFile();

const config = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI || defaultRedirectUri,
  scopes: process.env.SPOTIFY_AUTH_SCOPES || defaultScopes,
};

const missing = ["clientId", "clientSecret"].filter((key) => !config[key]);

if (missing.length > 0) {
  console.error(
    "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env.",
  );
  process.exit(1);
}

const redirectUrl = new URL(config.redirectUri);
const callbackPath = redirectUrl.pathname || "/callback";
const serverHost =
  redirectUrl.hostname === "[::1]" ? "::1" : redirectUrl.hostname;
const serverPort = Number(redirectUrl.port || 80);
const state = randomBytes(16).toString("hex");
const authUrl = new URL(`${spotifyAccountsBase}/authorize`);

authUrl.searchParams.set("client_id", config.clientId);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("redirect_uri", config.redirectUri);
authUrl.searchParams.set("scope", normalizeScopes(config.scopes));
authUrl.searchParams.set("state", state);

const server = createServer(handleCallback);

server.listen(serverPort, serverHost, () => {
  console.log("Open this URL in your browser:");
  console.log(authUrl.toString());
  console.log("");
  console.log(`Waiting for Spotify callback on ${config.redirectUri}`);
});

async function handleCallback(req, res) {
  const url = new URL(req.url || "/", config.redirectUri);

  if (url.pathname !== callbackPath) {
    sendText(res, 404, "Not found");
    return;
  }

  const error = url.searchParams.get("error");

  if (error) {
    sendText(res, 400, `Spotify authorization failed: ${error}`);
    closeServer(1);
    return;
  }

  if (url.searchParams.get("state") !== state) {
    sendText(res, 400, "Invalid state. Try again.");
    closeServer(1);
    return;
  }

  const code = url.searchParams.get("code");

  if (!code) {
    sendText(res, 400, "No code returned from Spotify.");
    closeServer(1);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const refreshToken = tokens.refresh_token || "";
    const scope = tokens.scope || "";

    if (!refreshToken) {
      sendText(res, 500, "Spotify did not return a refresh token.");
      closeServer(1);
      return;
    }

    console.log("");
    console.log("Add this to .env:");
    console.log(`SPOTIFY_REFRESH_TOKEN=${refreshToken}`);

    if (scope) {
      console.log("");
      console.log(`Granted scope: ${scope}`);
    }

    sendText(
      res,
      200,
      "Spotify refresh token was printed in the terminal. You can close this tab.",
    );
    closeServer(0);
  } catch (err) {
    console.error(err);
    sendText(res, 500, "Failed to exchange Spotify authorization code.");
    closeServer(1);
  }
}

async function exchangeCodeForTokens(code) {
  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`,
  ).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(`${spotifyAccountsBase}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.error_description || data?.error || "Spotify token request failed",
    );
  }

  return data;
}

function loadEnvFile() {
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
    const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim());

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function normalizeScopes(scopes) {
  return scopes.split(/[\s,]+/).filter(Boolean).join(" ");
}

function sendText(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

function closeServer(exitCode) {
  server.close(() => {
    process.exitCode = exitCode;
  });
}
