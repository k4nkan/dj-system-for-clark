# DJ Request App

Search Spotify tracks and add them to a playlist after password confirmation.

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
```

`SPOTIFY_REFRESH_TOKEN` needs one of:

```txt
playlist-modify-public
playlist-modify-private
```

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
compose.yaml   Docker + Cloudflare Tunnel
Makefile       Commands
```
