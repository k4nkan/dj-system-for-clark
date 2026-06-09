.PHONY: help setup start docker tunnel-quick tunnel-named down check token playlists

help:
	@printf "Commands:\n"
	@printf "  make setup          .env を作成\n"
	@printf "  make start          ローカル起動\n"
	@printf "  make docker         Docker でアプリ起動\n"
	@printf "  make tunnel-quick   Quick Tunnel で公開\n"
	@printf "  make tunnel-named   Named Tunnel で公開\n"
	@printf "  make down           Docker 停止\n"
	@printf "  make check          構文チェック\n"
	@printf "  make token          Spotify refresh token 取得\n"
	@printf "  make playlists      Spotify playlist 一覧\n"

setup:
	@test -f .env || cp .env.example .env

start:
	npm start

docker:
	docker compose up --build app

tunnel-quick:
	docker compose --profile quick-tunnel up --build

tunnel-named:
	docker compose --profile named-tunnel up --build

down:
	docker compose down

check:
	node --check server.js
	node --check public/app.js
	node --check scripts/get-spotify-refresh-token.js
	node --check scripts/list-playlists.js

token:
	node scripts/get-spotify-refresh-token.js "$(CODE)"

playlists:
	node scripts/list-playlists.js
