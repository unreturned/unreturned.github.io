PWD = $(shell pwd)

default: help

help:
	@echo "  make start         start local server via docker compose on http://localhost:3000"
	@echo "  make stop          stop local server"
	@echo "  make install-git   install git pre-commit hooks"

start:
	docker compose up -d
	@echo ""
	@echo "Server is running: open http://localhost:3000"
	@echo ""

stop:
	docker compose down

install-git:
	test -f scripts/install-hooks.sh
	chmod +x scripts/install-hooks.sh
	./scripts/install-hooks.sh
