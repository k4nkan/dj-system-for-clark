# DJ Request App

Docker と Cloudflare Quick Tunnel で公開する前提の最小構成です。

## 構成

```txt
frontend/      画面
backend/       API と frontend 配信
compose.yaml   app + Cloudflare Tunnel
Makefile       操作用コマンド
```

フロントは `/api/...` を相対 fetch します。Tunnel URL が毎回変わっても env 更新は不要です。

## 準備

```sh
make setup
```

`.env` に値を入れます。

```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REFRESH_TOKEN=...
SPOTIFY_PLAYLIST_ID=...
MENTOR_PASSWORD=...
```

## 起動

```sh
make up
```

ログに出る `https://...trycloudflare.com` が公開リンクです。

Tunnel のログだけ見る場合:

```sh
make logs
```

停止:

```sh
make down
```

## 確認

```sh
make check
```

## API

```txt
GET  /api/search?q=曲名
POST /api/requests
```

## 注意

- `.env` は commit しない。
- Quick Tunnel の公開リンクは起動ごとに変わります。
- `SPOTIFY_REFRESH_TOKEN` と `SPOTIFY_PLAYLIST_ID` が未設定だと追加できません。
- ローカル保存はしないため、履歴は Spotify プレイリスト側で確認します。
