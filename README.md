# DJ Request App

Search Spotify tracks and add them to a playlist after password confirmation.

The public UI keeps the existing confirmation flow. The authenticated admin page
at `/admin` opens or closes requests and changes the request password.
`/api/admin/now-playing` and `/api/admin/playlist` return the current playback
and up to 50 playlist items for admin sessions.

## Pages

<p>
  <img src="frontend/assets/view-1.webp" alt="View 1" width="220">
  <img src="frontend/assets/view-2.webp" alt="View 2" width="220">
  <img src="frontend/assets/view-3.webp" alt="View 3" width="220">
</p>

## Local Setup

```sh
npm install
```

Set `.env` for local development.

```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REFRESH_TOKEN=...
SPOTIFY_PLAYLIST_ID=...
REQUEST_PASSWORD=...
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
BLOB_READ_WRITE_TOKEN=...
```

`ADMIN_PASSWORD` is used only for `/admin` login. `REQUEST_PASSWORD` is the
initial password for adding tracks and may contain letters and numbers. After
it is changed from `/admin`, the new password is stored in Private Blob and
takes precedence over `REQUEST_PASSWORD`.
`ADMIN_SESSION_SECRET` signs the admin session cookie; use a long random value.
Without Blob, requests stay open and `REQUEST_PASSWORD` remains active.

`SPOTIFY_REFRESH_TOKEN` needs:

```txt
playlist-modify-public
playlist-modify-private
playlist-read-private
user-read-currently-playing
user-read-playback-state
```

## Refresh Token

Register this redirect URI in the Spotify Developer Dashboard:

```txt
http://[::1]:5000/callback
```

Then run:

```sh
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r tools/requirements-auth.txt
python3 tools/auth_server.py
```

The script reads `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` from `.env`.
Open `http://[::1]:5000/login`, authorize Spotify, and copy the returned
refresh token to `.env`.

## Local Development

```sh
npm run local
```

This starts the static frontend and API Functions with values from `.env`
without linking a Vercel project.

The script runs Node with `--use-system-ca` so requests to Spotify and Blob
trust certificates from the macOS keychain. This avoids
`SELF_SIGNED_CERT_IN_CHAIN` on networks that inspect HTTPS traffic, and requires
Node 22.15 or later.

To test with the Vercel Development environment variables instead, run:

```sh
npm run link
NODE_OPTIONS=--use-system-ca npx vercel pull
NODE_OPTIONS=--use-system-ca npx vercel dev
```

Open `http://localhost:3000/` for the public UI and
`http://localhost:3000/admin` for the admin UI.

## Vercel

Import this repository into Vercel and add the values from `.env.example` to the
Production environment variables. Vercel serves the existing UI and the API
Functions in `api/` without a persistent application server.

```txt
/        public request UI
/admin   authenticated request settings
```

The configured Spotify playlist must be owned by, or collaborative with, the
account that issued `SPOTIFY_REFRESH_TOKEN` for its items to be available.

Create a Private Blob store from the project's Storage tab and connect it to the
project. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically. Redeploy after
connecting it. Request availability and the request password are saved as
`settings.json` in the private store. `settings.example.json` documents its
shape; the application creates the real blob on the first settings update.

Connect separate Blob stores to Preview and Production if their settings should
not be shared.

## Check

```sh
npm run check
```

## Files

```txt
frontend/      UI
api/           Vercel Functions
tests/         API tests
tools/         Spotify refresh token utility
vercel.json    Vercel routes and Functions configuration
```
