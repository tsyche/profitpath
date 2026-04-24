.PHONY: help setup dev build preview test test-unit test-e2e test-e2e-headed lint lintfix clean node-clean fresh

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)ProfitPath - Available Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Setup:$(NC)"
	@echo "  make setup            Install dependencies (npm ci)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev              Start dev server (Vite on localhost:3000)"
	@echo "  make build            Build for production"
	@echo "  make preview          Preview production build"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  make test             Run all tests (unit + e2e with green result check)"
	@echo "  make test-unit        Run Vitest unit tests only"
	@echo "  make test-e2e         Run Playwright e2e tests only"
	@echo "  make test-e2e-headed  Run Playwright e2e tests with visible browser"
	@echo ""
	@echo "$(GREEN)Linting:$(NC)"
	@echo "  make lint             Lint check (ESLint)"
	@echo "  make lintfix          Auto-fix linting issues"
	@echo ""
	@echo "$(GREEN)Maintenance:$(NC)"
	@echo "  make clean            Remove build cache (.vite)"
	@echo "  make node-clean       Remove node_modules"
	@echo "  make fresh            Full reset: node-clean + setup + test + lintfix + dev"
	@echo ""

setup:
	npm ci

dev: setup
	npm run dev

build: setup
	npm run build

preview: setup
	npm run preview

test: setup
	npm run test:run && npm run test:e2e

test-unit: setup
	npm run test:run

test-e2e: setup
	npm run test:e2e

test-e2e-headed: setup
	npm run test:e2e:headed

lint: setup
	npm run lint

lintfix: setup
	npm run lint:fix

clean:
	rm -rf node_modules/.vite

node-clean:
	rm -rf node_modules

fresh: node-clean clean setup test lintfix dev
	@echo "$(GREEN)✓ Fresh start complete: node-clean + clean + setup + test + lintfix + dev$(NC)"
