# DJ Request App

Search Spotify tracks and add them to a playlist after password confirmation.

The public UI keeps the existing confirmation flow. The authenticated admin page
at `/admin` shows the current playback and up to 50 playlist items.

## Pages

<p>
  <img src="frontend/assets/view-1.webp" alt="View 1" width="220">
  <img src="frontend/assets/view-2.webp" alt="View 2" width="220">
  <img src="frontend/assets/view-3.webp" alt="View 3" width="220">
</p>

## Setup

```sh
make setup
```

Set `.env`.

```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REFRESH_TOKEN=...
SPOTIFY_PLAYLIST_ID=...
MENTOR_PASSWORD=...
ADMIN_SESSION_SECRET=...
```

`ADMIN_SESSION_SECRET` signs the admin session cookie. Use a long random value.

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

## Share

```sh
make
```

Send the printed `https://...trycloudflare.com` URL or
`tools/output/share-qr.png`.

`make` updates the QR image after the public URL is issued.

```sh
make qr URL=https://example.trycloudflare.com
```

## Stop

```sh
make down
```

## Vercel

Import this repository into Vercel and add the values from `.env.example` to the
Production environment variables. Vercel serves the existing UI and the API
Functions in `api/` without a persistent server or database.

```txt
/        public request UI
/admin   authenticated playback and playlist view
```

The configured Spotify playlist must be owned by, or collaborative with, the
account that issued `SPOTIFY_REFRESH_TOKEN` for its items to be available.

## Check

```sh
make check
```

## Files

```txt
frontend/      UI
api/           Vercel Functions
backend/       Local Docker API
tests/         API tests
tools/         Local utilities and generated share assets
compose.yaml   Docker + Cloudflare Tunnel
Makefile       Commands
```
