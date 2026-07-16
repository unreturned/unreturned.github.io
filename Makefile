PWD = $(shell pwd)

default: help

help:
	@echo "  make start         start local server on http://localhost:3000"
	@echo "  make stop          stop local server"
	@echo "  make resume        validate resume.json"
	@echo "  make install-git   install git pre-commit hooks"
	@echo "  make test          open index.html locally"

start:
	docker compose up -d

stop:
	docker compose down

resume:
	python3 -m json.tool resume.json > /dev/null
	test -f js/resume.js
	test -f css/resume.css

install-git:
	test -f scripts/install-hooks.sh
	chmod +x scripts/install-hooks.sh
	./scripts/install-hooks.sh

test:
	open file://$(PWD)/index.html
