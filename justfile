# Project task runner. Run `just --list` to see all available commands.

# Default: show available commands
default:
    @just --list

# --- Setup ---

# Install dependencies (npm ci)
setup:
    npm ci

# --- Development ---

# Start dev server (Vite on localhost:3000)
dev: setup
    npm run dev

# Build for production
build: setup
    npm run build

# Preview production build
preview: setup
    npm run preview

# --- Testing ---

# Run all tests (unit + e2e)
test: setup
    npm run test:run && npm run test:e2e

# Run Vitest unit tests only
test-unit: setup
    npm run test:run

# Run Playwright e2e tests only
test-e2e: setup
    npm run test:e2e

# Run Playwright e2e tests with visible browser
test-e2e-headed: setup
    npm run test:e2e:headed

# --- Linting ---

# Lint check (ESLint)
lint: setup
    npm run lint

# Auto-fix linting issues
lintfix: setup
    npm run lint:fix

# --- Maintenance ---

# Sync CLAUDE.md ↔ AGENTS.md (copy newer to older)
sync-docs:
    #!/usr/bin/env bash
    if [ ! -f CLAUDE.md ] || [ ! -f AGENTS.md ]; then
        printf '\033[0;31m✗ Both CLAUDE.md and AGENTS.md required\033[0m\n'
        exit 1
    fi
    if [ CLAUDE.md -nt AGENTS.md ]; then
        cp CLAUDE.md AGENTS.md
        printf '\033[0;32m✓ Synced CLAUDE.md → AGENTS.md\033[0m\n'
    elif [ AGENTS.md -nt CLAUDE.md ]; then
        cp AGENTS.md CLAUDE.md
        printf '\033[0;32m✓ Synced AGENTS.md → CLAUDE.md\033[0m\n'
    else
        printf '\033[0;32m✓ CLAUDE.md and AGENTS.md already in sync\033[0m\n'
    fi

# Remove build cache (.vite)
clean:
    rm -rf node_modules/.vite

# Remove node_modules
node-clean:
    rm -rf node_modules

# Full reset: node-clean + clean + setup + test + lintfix + dev
fresh: node-clean clean setup test lintfix dev
    @printf '\033[0;32m✓ Fresh start complete: node-clean + clean + setup + test + lintfix + dev\033[0m\n'

# --- Mobile ---

# Build and sync web assets to iOS and Android
mobile-sync: build
    npx cap sync
    PATH="$HOME/.asdf/installs/ruby/3.2.0/bin:$PATH" pod install --project-directory=ios/App
    @printf '\033[0;32m✓ Web assets synced to iOS and Android\033[0m\n'

# Sync and open Xcode (iOS)
mobile-ios: mobile-sync
    npx cap open ios

# Sync and open Android Studio
mobile-android: mobile-sync
    npx cap open android
