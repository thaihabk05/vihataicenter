.PHONY: help dev up down build logs migrate seed test lint clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

up: ## Start production environment
	docker compose up -d --build

down: ## Stop all services
	docker compose down

build: ## Build Docker images
	docker compose build

logs: ## Show API logs
	docker compose logs -f api

migrate: ## Run database migrations
	docker compose exec api alembic upgrade head

migrate-create: ## Create new migration (usage: make migrate-create msg="add users table")
	docker compose exec api alembic revision --autogenerate -m "$(msg)"

seed: ## Seed initial data
	docker compose exec api python scripts/setup_db.py

test: ## Run tests
	docker compose exec api pytest -v

lint: ## Run linter
	docker compose exec api ruff check .

clean: ## Clean up volumes and containers
	docker compose down -v --remove-orphans

db-shell: ## Open PostgreSQL shell
	docker compose exec postgres psql -U vihat -d vihat_knowledge

redis-cli: ## Open Redis CLI
	docker compose exec redis redis-cli
