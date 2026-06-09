.DEFAULT_GOAL := share

.PHONY: share setup down logs check help

share: setup
	docker compose up --build -d
	@printf "\n公開リンクを発行中...\n"
	@for i in $$(seq 1 60); do \
		url=$$(docker compose logs --no-color tunnel 2>/dev/null \
			| grep -Eo 'https://[^ ]+\.trycloudflare\.com' \
			| tail -n 1); \
		if [ -n "$$url" ]; then \
			printf "\n公開リンク:\n%s\n\n" "$$url"; \
			printf "このURLを配ればOKです。停止は make down\n"; \
			exit 0; \
		fi; \
		sleep 1; \
	done; \
	printf "\n公開リンクを取得できませんでした。make logs で確認してください。\n"; \
	exit 1

setup:
	@test -f .env || cp .env.example .env

down:
	docker compose down

logs:
	docker compose logs -f tunnel

check:
	node --check backend/server.js
	node --check frontend/app.js

help:
	@printf "Commands:\n"
	@printf "  make / make share   公開リンクを発行\n"
	@printf "  make down           停止\n"
	@printf "  make logs           Tunnelログを表示\n"
	@printf "  make check          構文チェック\n"
