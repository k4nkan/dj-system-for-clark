.DEFAULT_GOAL := share

.PHONY: share setup down logs check help

share: setup
	@started_at=$$(date -u +%Y-%m-%dT%H:%M:%SZ); \
	docker compose up --build --force-recreate -d; \
	printf "\nLocal: http://localhost:3000\n"; \
	printf "\nWaiting for tunnel URL...\n"; \
	for i in $$(seq 1 60); do \
		url=$$(docker compose logs --no-color --since "$$started_at" tunnel 2>/dev/null \
			| grep -Eo 'https://[^ ]+\.trycloudflare\.com' \
			| tail -n 1); \
		if [ -n "$$url" ]; then \
			printf "\nShare URL: %s\n" "$$url"; \
			printf "Stop: make down\n"; \
			exit 0; \
		fi; \
		sleep 1; \
	done; \
	printf "\nNo tunnel URL found. Run: make logs\n"; \
	exit 1

setup:
	@test -f .env || cp .env.example .env

reload:
	docker compose up --build -d app

down:
	docker compose down

logs:
	docker compose logs -f tunnel

check:
	node --check backend/server.js
	node --check frontend/scripts/app.js
	node --check frontend/scripts/decor.js
	node --check tools/spotify-refresh-token.js

help:
	@printf "Commands:\n"
	@printf "  make / make share   start and print public URL\n"
	@printf "  make down           stop containers\n"
	@printf "  make logs           show tunnel logs\n"
	@printf "  make check          syntax check\n"
