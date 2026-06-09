.PHONY: help setup up down logs check

help:
	@printf "Commands:\n"
	@printf "  make setup   .env を作成\n"
	@printf "  make up      Docker + Cloudflare Tunnel 起動\n"
	@printf "  make down    Docker 停止\n"
	@printf "  make logs    Tunnel URL を確認\n"
	@printf "  make check   構文チェック\n"

setup:
	@test -f .env || cp .env.example .env

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f tunnel

check:
	node --check backend/server.js
	node --check frontend/app.js
