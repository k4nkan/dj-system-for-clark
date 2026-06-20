# DJ Request App

Search Spotify tracks and add them to a playlist after password confirmation.

## Setup

```sh
make setup
```

Set `.env`.

```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback
SPOTIFY_REFRESH_TOKEN=...
SPOTIFY_PLAYLIST_ID=...
MENTOR_PASSWORD=...
```

`SPOTIFY_REFRESH_TOKEN` needs one of:

```txt
playlist-modify-public
playlist-modify-private
```

Get a refresh token:

```sh
npm run spotify:token
```

Add `SPOTIFY_REDIRECT_URI` to the Spotify app Redirect URIs first.

## Share

```sh
make
```

Send the printed `https://...trycloudflare.com` URL.

## Stop

```sh
make down
```

## Check

```sh
make check
```

## Files

```txt
frontend/      UI
backend/       API
tools/         Standalone helper scripts
compose.yaml   Docker + Cloudflare Tunnel
Makefile       Commands
```
