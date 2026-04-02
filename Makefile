.PHONY: help dev build preview test test-unit test-e2e lint lint-fix clean fresh install

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)ProfitPath - Available Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev              Start dev server (Vite on localhost:5173)"
	@echo "  make build            Build for production"
	@echo "  make preview          Preview production build"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  make test             Run all tests (unit + e2e with green result check)"
	@echo "  make test-unit        Run Vitest unit tests only"
	@echo "  make test-e2e         Run Playwright e2e tests only"
	@echo ""
	@echo "$(GREEN)Linting:$(NC)"
	@echo "  make lint             Lint check (ESLint)"
	@echo "  make lint-fix         Auto-fix linting issues"
	@echo ""
	@echo "$(GREEN)Maintenance:$(NC)"
	@echo "  make clean            Remove node_modules/.vite cache"
	@echo "  make install          Install dependencies (npm ci)"
	@echo "  make fresh            Full reset: clean + install + test + lint-fix + dev"
	@echo ""

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

test:
	npm run test:run && npm run test:e2e

test-unit:
	npm run test:run

test-e2e:
	npm run test:e2e

lint:
	npm run lint

lint-fix:
	npm run lint:fix

clean:
	rm -rf node_modules/.vite

install:
	npm ci

fresh: clean install test lint-fix dev
	@echo "$(GREEN)✓ Fresh start complete: clean + install + test + lint-fix + dev$(NC)"
