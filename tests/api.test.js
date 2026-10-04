import assert from "node:assert/strict";
import test from "node:test";

import login from "../api/admin/login.js";
import playlist from "../api/admin/playlist.js";
import adminSettings from "../api/admin/settings.js";
import requestTrack from "../api/requests.js";
import search from "../api/search.js";

process.env.SPOTIFY_CLIENT_ID = "client";
process.env.SPOTIFY_CLIENT_SECRET = "secret";
process.env.SPOTIFY_REFRESH_TOKEN = "refresh";
process.env.SPOTIFY_PLAYLIST_ID = "playlist";
process.env.MENTOR_PASSWORD = "1234";
process.env.ADMIN_SESSION_SECRET = "test-session-secret";

test("Vercel API searches, adds, and protects playlist information", async () => {
  const calls = [];
  let redisSettings = null;
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    if (String(url) === "https://redis.example") {
      const [command, , value] = JSON.parse(options.body);

      if (command === "GET") {
        return Response.json({ result: redisSettings });
      }

      if (command === "SET") {
        redisSettings = value;
        return Response.json({ result: "OK" });
      }
    }

    if (String(url).includes("/api/token")) {
      return Response.json({ access_token: "token", expires_in: 3600 });
    }

    if (String(url).includes("/search")) {
      return Response.json({ tracks: { items: [spotifyTrack()] } });
    }

    if (String(url).endsWith("/playlists/playlist/items") && options.method === "POST") {
      return Response.json({ snapshot_id: "snapshot" }, { status: 201 });
    }

    if (String(url).endsWith("/playlists/playlist/items?limit=50")) {
      return Response.json({ total: 1, items: [{ item: spotifyTrack() }] });
    }

    if (String(url).endsWith("/playlists/playlist")) {
      return Response.json({
        id: "playlist",
        name: "Clark Playlist",
        description: "",
        images: [],
        external_urls: { spotify: "https://open.spotify.com/playlist/playlist" },
        owner: { display_name: "Clark" },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const searchResponse = createResponse();
  await search({ method: "GET", query: { q: "song" } }, searchResponse);
  assert.equal(searchResponse.statusCode, 200);
  assert.equal(searchResponse.body.tracks[0].name, "Song");
  assert.match(calls.find((call) => call.url.includes("/search")).url, /limit=10/);

  const requestResponse = createResponse();
  await requestTrack(
    {
      method: "POST",
      body: { mentorPassword: "1234", trackUri: "spotify:track:track" },
    },
    requestResponse,
  );
  assert.equal(requestResponse.statusCode, 201);
  assert.ok(calls.some((call) => call.url.endsWith("/playlists/playlist/items")));

  const unauthorizedResponse = createResponse();
  await playlist({ method: "GET", headers: {} }, unauthorizedResponse);
  assert.equal(unauthorizedResponse.statusCode, 401);

  const loginResponse = createResponse();
  await login({ method: "POST", body: { password: "1234" } }, loginResponse);
  const cookie = loginResponse.headers["Set-Cookie"].split(";")[0];

  const playlistResponse = createResponse();
  await playlist(
    { method: "GET", headers: { cookie } },
    playlistResponse,
  );
  assert.equal(playlistResponse.statusCode, 200);
  assert.equal(playlistResponse.body.playlist.name, "Clark Playlist");
  assert.equal(playlistResponse.body.playlist.tracks[0].name, "Song");

  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
  process.env.UPSTASH_REDIS_REST_TOKEN = "redis-token";

  const closeResponse = createResponse();
  await adminSettings(
    { method: "PATCH", headers: { cookie }, body: { enabled: false } },
    closeResponse,
  );
  assert.equal(closeResponse.statusCode, 200);
  assert.equal(closeResponse.body.settings.enabled, false);

  const closedSearchResponse = createResponse();
  await search({ method: "GET", query: { q: "song" } }, closedSearchResponse);
  assert.equal(closedSearchResponse.statusCode, 403);

  const passwordResponse = createResponse();
  await adminSettings(
    {
      method: "PATCH",
      headers: { cookie },
      body: { currentPassword: "1234", newPassword: "5678" },
    },
    passwordResponse,
  );
  assert.equal(passwordResponse.statusCode, 200);
  assert.equal(passwordResponse.body.settings.hasCustomPassword, true);

  const oldPasswordResponse = createResponse();
  await login(
    { method: "POST", body: { password: "1234" } },
    oldPasswordResponse,
  );
  assert.equal(oldPasswordResponse.statusCode, 401);

  const newPasswordResponse = createResponse();
  await login(
    { method: "POST", body: { password: "5678" } },
    newPasswordResponse,
  );
  assert.equal(newPasswordResponse.statusCode, 200);

  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

function spotifyTrack() {
  return {
    id: "track",
    uri: "spotify:track:track",
    type: "track",
    name: "Song",
    artists: [{ name: "Artist" }],
    album: { name: "Album", images: [] },
    duration_ms: 180000,
    external_urls: { spotify: "https://open.spotify.com/track/track" },
  };
}

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
