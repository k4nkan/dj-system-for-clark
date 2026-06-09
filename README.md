# DJ Request App

Spotify の曲を検索し、メンター確認後に指定プレイリストへ直接追加するアプリです。

## 使い方

最初だけ `.env` を作ります。

```sh
make setup
```

`.env` に必要な値を入れます。

```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REFRESH_TOKEN=...
SPOTIFY_PLAYLIST_ID=...
MENTOR_PASSWORD=...
```

`SPOTIFY_REFRESH_TOKEN` は別の手段で用意して `.env` に入れます。プレイリスト追加に使うため、token には次のどちらかの scope が必要です。

```txt
playlist-modify-public
playlist-modify-private
```

## Refresh token の扱い

このアプリでは、Spotify の refresh token を `.env` に入れて使います。refresh token は、Spotify の access token を再発行するための認証情報です。access token は短時間で期限切れになりますが、refresh token が有効なら、アプリは起動中に必要な access token を自動で取得します。

refresh token は、発行時に許可した scope だけを持ちます。このアプリから後で scope を増やすことはできません。曲をプレイリストへ追加するには、refresh token 発行時に `playlist-modify-public` または `playlist-modify-private` を含めておく必要があります。

`.env` は秘密情報を含むため、Git に commit しません。refresh token の発行・更新はこの repo の外で行い、この repo では用意済みの `SPOTIFY_REFRESH_TOKEN` を使うだけにします。

公開リンクを発行します。

```sh
make
```

または:

```sh
make share
```

表示された `https://...trycloudflare.com` を配ればOKです。フロントと API は同じリンクで動きます。

停止:

```sh
make down
```

リンクや Tunnel ログをもう一度見る:

```sh
make logs
```

## 構成

```txt
frontend/      画面
backend/       API と frontend 配信
compose.yaml   app + Cloudflare Tunnel
Makefile       起動コマンド
```

アクセスの流れ:

```txt
配布した Cloudflare URL
  -> frontend/
  -> /api/search
  -> /api/requests
  -> Spotify playlist
```

フロントは `/api/...` を相対パスで呼びます。Tunnel URL が毎回変わっても、フロント側の env 更新は不要です。

## 確認

```sh
make check
```

## API

```txt
GET  /api/search?q=曲名
POST /api/requests
```

`POST /api/requests`:

```json
{
  "mentorPassword": "1234",
  "trackUri": "spotify:track:..."
}
```

## 注意

- `.env` は commit しない。
- Quick Tunnel の公開リンクは起動ごとに変わります。
- ローカル保存はしません。履歴は Spotify プレイリスト側で確認します。
- `SPOTIFY_REFRESH_TOKEN` と `SPOTIFY_PLAYLIST_ID` が未設定だと追加できません。
- `Spotify tokenの権限が足りません` と出た場合、refresh token の scope に `playlist-modify-public` または `playlist-modify-private` が入っていません。
