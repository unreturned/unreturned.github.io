start:
	docker-compose up -d
	echo "Go to http://localhost:3000/"

stop:
	docker-compose down

install-git: ## Установить Git pre-commit hooks
	@echo "$(BLUE)Установка Git hooks...$(NC)"
	@if [ -f scripts/install-hooks.sh ]; then \
		chmod +x scripts/install-hooks.sh; \
		./scripts/install-hooks.sh; \
		echo "$(GREEN)✓ Git hooks установлены!$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Файл scripts/install-hooks.sh не найден!$(NC)"; \
		exit 1; \
	fi
