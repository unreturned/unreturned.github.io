# Цветовые коды для вывода
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

.PHONY: start stop install-git help

help: ## Показать список доступных команд
	@echo "$(BLUE)Доступные команды:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

start: ## Запустить локальный сервер на http://localhost:3000
	docker-compose up -d
	@echo "$(GREEN)✓ Сервер запущен на http://localhost:3000/$(NC)"

stop: ## Остановить локальный сервер
	docker-compose down
	@echo "$(GREEN)✓ Сервер остановлен$(NC)"

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
