.DEFAULT_GOAL := share

.PHONY: share setup down logs check help

share: setup
	@docker compose up --build -d
	@printf "\nWaiting for tunnel URL...\n"
	@for i in $$(seq 1 60); do \
		url=$$(docker compose logs --no-color tunnel 2>/dev/null \
			| grep -Eo 'https://[^ ]+\.trycloudflare\.com' \
			| tail -n 1); \
		if [ -n "$$url" ]; then \
			printf "\nURL: %s\n" "$$url"; \
			printf "Stop: make down\n"; \
			exit 0; \
		fi; \
		sleep 1; \
	done; \
	printf "\nNo tunnel URL found. Run: make logs\n"; \
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
	@printf "  make / make share   start and print public URL\n"
	@printf "  make down           stop containers\n"
	@printf "  make logs           show tunnel logs\n"
	@printf "  make check          syntax check\n"
