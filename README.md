# DJ Request App

Spotify の曲検索、メンター確認、リクエスト保存、Spotify プレイリスト追加を行う最小構成の Web アプリです。

## 構成

```txt
server.js        API と静的ファイル配信
public/          フロントエンド
data/            リクエスト保存先
scripts/         Spotify token 確認用
Makefile         起動コマンド
compose.yaml     Docker / Cloudflare Tunnel 起動用
```

## 準備

Node.js 18 以上を使います。外部 npm パッケージはありません。

```sh
make setup
```

`.env` に Spotify とメンター確認用の値を入れます。

```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REFRESH_TOKEN=...
SPOTIFY_PLAYLIST_ID=...
MENTOR_PASSWORD=...
```

## 起動

```sh
make start
```

```txt
http://127.0.0.1:3000
```

Docker で起動する場合:

```sh
make docker
```

## Cloudflare Tunnel

フロントもこのアプリから配信するなら、公開された Tunnel URL をそのまま開けば API も同一 origin で動きます。この場合 `DJ_API_BASE_URL` は空で問題ありません。

無料で URL を毎回発行する Quick Tunnel:

```sh
make tunnel-quick
```

ログに出る `https://...trycloudflare.com` を開きます。Quick Tunnel の URL は起動ごとに変わるため、外部ホストのフロントから呼ぶ場合は、その URL をフロント側の env / runtime config に入れ直します。

固定 URL にしたい場合は named tunnel を使います。Cloudflare 側で Public Hostname の service を `http://app:3000` にし、`.env` に token を入れます。

```env
CLOUDFLARE_TUNNEL_TOKEN=...
```

```sh
make tunnel-named
```

外部フロントから API を呼ぶ場合は、次を設定します。

```env
DJ_API_BASE_URL=https://your-backend.example.com
ALLOWED_ORIGINS=https://your-frontend.example.com
```

## Spotify token

認可 URL を作ります。

```sh
make token
```

表示された Redirect URI を Spotify app settings に登録し、表示された URL を開きます。承認後の URL または `code` を使って refresh token を取得します。

```sh
make token CODE="PASTE_CODE_OR_URL"
```

プレイリスト ID は次で確認できます。

```sh
make playlists
```

## よく使うコマンド

```sh
make help
make check
make down
```

## API

```txt
GET  /api/search?q=曲名
GET  /api/requests
POST /api/requests
```

## 注意

- `.env` は commit しない。
- `SPOTIFY_REFRESH_TOKEN` と `SPOTIFY_PLAYLIST_ID` が未設定でも保存はできますが、Spotify プレイリストには追加されません。
- Quick Tunnel は開発・検証向けです。運用で URL 更新を避けたい場合は named tunnel を使います。
