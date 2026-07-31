# Top-level entry point for common tasks.
#
# Make is the stable interface: `make check` means the same thing in a terminal,
# in a hook, and in CI, even when the command underneath changes. Targets stay
# thin wrappers — the logic lives in package scripts and configs, so nothing here
# is a second implementation that can disagree with them.
#
# Run `make` or `make help` for the list.

# Fail loudly rather than continuing past a broken step.
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c

.DEFAULT_GOAL := help

# Nothing here builds a file named after the target.
.PHONY: help install hooks check verify format format-check lint lint-fix \
        typecheck spell knip layers bundle-budget test test-scripts test-integration \
        e2e lighthouse \
        changeset clean clean-all \
        deps-up deps-up-test deps-down \
        db-up db-up-test db-down db-wait db-migrate db-seed db-reset db-push \
        email

# Do not `include .env` here: Make treats `//` as a comment, which truncates
# URLs like APP_URL=http://…. Scripts load `.env` via Node `--env-file` instead.
COMPOSE      := docker compose -f docker/compose.yaml
COMPOSE_TEST := docker compose -f docker/compose.test.yaml
ENV_FILE     := $(if $(wildcard .env),.env,.env.example)

## ----------------------------------------------------------------------------
## Help
## ----------------------------------------------------------------------------

help: ## List available targets
	@printf '\nUsage: make <target>\n\n'
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN { FS = ":.*?## " } { printf "  \033[1m%-16s\033[0m %s\n", $$1, $$2 }'
	@printf '\n'

## ----------------------------------------------------------------------------
## Setup
## ----------------------------------------------------------------------------

install: ## Install dependencies and Git hooks
	pnpm install

hooks: ## Reinstall Git hooks
	pnpm exec lefthook install

## ----------------------------------------------------------------------------
## Quality gates
##
## `check` is what CI runs and what you run before pushing. It is deliberately
## one command: a gate people have to remember the parts of is a gate that gets
## partially run.
## ----------------------------------------------------------------------------

check: ## Run every quality gate (what CI runs)
	pnpm check
	$(MAKE) bundle-budget

verify: check ## Alias for `check`

format: ## Format all supported files in place
	pnpm format

format-check: ## Fail if anything is unformatted
	pnpm format:check

lint: ## Lint, including type-aware rules
	pnpm lint

lint-fix: ## Lint and apply safe fixes
	pnpm lint:fix

typecheck: ## Type-check every package
	pnpm typecheck

spell: ## Spell-check code, comments, and docs
	pnpm spell

knip: ## Find unused files, exports, and dependencies
	pnpm knip

layers: ## Assert package layer boundaries (ADR-0002)
	pnpm check:layers

bundle-budget: ## Build apps/web and assert First Load JS budgets
	pnpm --filter @repo/web build
	pnpm --filter @repo/web bundle-budget

## ----------------------------------------------------------------------------
## Tests
## ----------------------------------------------------------------------------

test: ## Run unit tests
	pnpm test

test-scripts: ## Test the repo's own tooling scripts
	pnpm test:scripts

test-integration: ## Run integration tests (requires `make deps-up-test`)
	DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55433/app_test \
		REDIS_URL=redis://127.0.0.1:55435 \
		S3_ENDPOINT=http://127.0.0.1:55440 \
		S3_REGION=auto \
		S3_BUCKET=app-test \
		S3_ACCESS_KEY_ID=minioadmin \
		S3_SECRET_ACCESS_KEY=minioadmin \
		SMTP_URL=smtp://127.0.0.1:55441 \
		MAILPIT_API_URL=http://127.0.0.1:55442 \
		BETTER_AUTH_SECRET=dev-local-better-auth-secret-min-32-chars \
		BETTER_AUTH_URL=http://localhost:3000 \
		NODE_ENV=development APP_ENV=local APP_URL=http://localhost:3000 \
		pnpm test:integration

# Test-stack env for web E2E / Lighthouse (deps-up-test ports).
E2E_ENV := \
	NODE_ENV=production \
	APP_ENV=test \
	APP_URL=http://127.0.0.1:3000 \
	NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 \
	NEXT_PUBLIC_APP_ENV=test \
	LOG_LEVEL=error \
	DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55433/app_test \
	DATABASE_POOL_SIZE=5 \
	REDIS_URL=redis://127.0.0.1:55435 \
	BETTER_AUTH_SECRET=dev-local-better-auth-secret-min-32-chars \
	BETTER_AUTH_URL=http://127.0.0.1:3000 \
	EMAIL_FROM=noreply@example.com \
	RESEND_API_KEY=re_test_replace_me \
	SMTP_URL=smtp://127.0.0.1:55441 \
	MAILPIT_API_URL=http://127.0.0.1:55442 \
	S3_ENDPOINT=http://127.0.0.1:55440 \
	S3_REGION=auto \
	S3_BUCKET=app-test \
	S3_ACCESS_KEY_ID=minioadmin \
	S3_SECRET_ACCESS_KEY=minioadmin

e2e: ## Playwright E2E against deps-up-test + next start
	$(MAKE) deps-up-test
	$(E2E_ENV) pnpm --filter @repo/db exec tsx src/migrate.ts
	$(E2E_ENV) pnpm --filter @repo/web build
	pnpm --filter @repo/web exec playwright install chromium
	$(E2E_ENV) pnpm --filter @repo/web test:e2e

lighthouse: ## Lighthouse CI against a production next start (deps-up-test)
	$(MAKE) deps-up-test
	$(E2E_ENV) pnpm --filter @repo/db exec tsx src/migrate.ts
	$(E2E_ENV) pnpm --filter @repo/web build
	$(E2E_ENV) pnpm --filter @repo/web lighthouse

## ----------------------------------------------------------------------------
## Local dependencies (Docker)
## ----------------------------------------------------------------------------

deps-up: ## Start Postgres, Redis, MinIO, Mailpit
	$(COMPOSE) up -d postgres redis minio minio-init mailpit
	@$(MAKE) db-wait
	@until $(COMPOSE) exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 0.5; done

deps-up-test: ## Start ephemeral dependency stack for integration tests
	$(COMPOSE_TEST) up -d
	@until $(COMPOSE_TEST) exec -T postgres pg_isready -U postgres -d app_test >/dev/null 2>&1; do \
		sleep 0.5; \
	done
	@until $(COMPOSE_TEST) exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 0.5; done

deps-down: ## Stop local dependency containers
	-$(COMPOSE) down
	-$(COMPOSE_TEST) down

## ----------------------------------------------------------------------------
## Database
## ----------------------------------------------------------------------------

db-up: ## Start local Postgres only
	$(COMPOSE) up -d postgres
	@$(MAKE) db-wait

db-up-test: ## Start ephemeral Postgres for integration tests (port 55433)
	$(COMPOSE_TEST) up -d postgres
	@until $(COMPOSE_TEST) exec -T postgres pg_isready -U postgres -d app_test >/dev/null 2>&1; do \
		sleep 0.5; \
	done

db-down: deps-down ## Alias for deps-down

db-wait: ## Block until local Postgres accepts connections
	@until $(COMPOSE) exec -T postgres pg_isready -U postgres -d app >/dev/null 2>&1; do \
		sleep 0.5; \
	done

db-migrate: ## Apply pending Drizzle migrations
	pnpm --filter @repo/db exec tsx --env-file=$(CURDIR)/$(ENV_FILE) src/migrate.ts

db-seed: ## Run reference + dev seeds
	pnpm --filter @repo/db exec tsx --env-file=$(CURDIR)/$(ENV_FILE) src/seeds/run.ts reference
	pnpm --filter @repo/db exec tsx --env-file=$(CURDIR)/$(ENV_FILE) src/seeds/run.ts dev

db-reset: ## Drop the app database, migrate, and seed
	$(COMPOSE) up -d postgres
	@$(MAKE) db-wait
	$(COMPOSE) exec -T postgres psql -U postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'app' AND pid <> pg_backend_pid();"
	$(COMPOSE) exec -T postgres psql -U postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS app;"
	$(COMPOSE) exec -T postgres psql -U postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE app;"
	@$(MAKE) db-migrate
	@$(MAKE) db-seed

db-push: ## Push schema without a migration (local iteration only)
	pnpm --filter @repo/db exec drizzle-kit push

## ----------------------------------------------------------------------------
## Email
## ----------------------------------------------------------------------------

email: ## Start the React Email preview server
	pnpm --filter @repo/email email:dev

## ----------------------------------------------------------------------------
## Release
## ----------------------------------------------------------------------------

changeset: ## Record a change for the changelog
	pnpm changeset

## ----------------------------------------------------------------------------
## Housekeeping
## ----------------------------------------------------------------------------

clean: ## Remove build output and caches, keep node_modules
	rm -rf .turbo node_modules/.cache
	find . -name '.turbo' -type d -prune -not -path './node_modules/*' -exec rm -rf {} +
	find . -name 'dist' -type d -prune -not -path './node_modules/*' -exec rm -rf {} +
	find . -name '.next' -type d -prune -not -path './node_modules/*' -exec rm -rf {} +
	find . -name '*.tsbuildinfo' -not -path './node_modules/*' -delete

clean-all: clean ## Also remove every node_modules (forces a cold install)
	find . -name 'node_modules' -type d -prune -exec rm -rf {} +
