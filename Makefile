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
.PHONY: help install hooks setup check verify format format-check lint lint-fix \
        typecheck typecheck-affected spell knip layers bundle-budget openapi-check \
        test test-affected test-scripts test-integration \
        e2e e2e-host lighthouse images image-size \
        load zap restore-drill \
        changeset clean clean-all \
        deps-up deps-up-test deps-up-test-worker deps-down \
        prod-up prod-down \
        db-up db-up-test db-down db-wait db-migrate db-seed db-reset db-push \
        email dev


# Do not `include .env` here: Make treats `//` as a comment, which truncates
# URLs like APP_URL=http://…. Scripts load `.env` via Node `--env-file` instead.
COMPOSE      := docker compose -f docker/compose.yaml
COMPOSE_TEST := docker compose -f docker/compose.test.yaml
COMPOSE_E2E  := docker compose -f docker/compose.e2e.yaml
COMPOSE_PROD := docker compose -f docker/compose.prod.yaml
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

setup: ## Idempotent clean-machine bootstrap (tools, deps, .env, services, migrate, seed)
	@command -v node >/dev/null || (echo "Node.js >= 24 is required" && exit 1)
	@node -e "const [m]=process.versions.node.split('.').map(Number); if(m<24){console.error('Node.js >= 24 required, found',process.versions.node); process.exit(1)}"
	@command -v pnpm >/dev/null || (echo "pnpm >= 11 is required (corepack enable)" && exit 1)
	@command -v docker >/dev/null || (echo "Docker is required" && exit 1)
	@docker info >/dev/null 2>&1 || (echo "Docker daemon is not running" && exit 1)
	pnpm install
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env from .env.example"; fi
	@if [ ! -f apps/docs/.env ]; then cp apps/docs/.env.example apps/docs/.env; echo "Created apps/docs/.env from apps/docs/.env.example"; fi
	$(MAKE) deps-up

	$(MAKE) db-migrate
	$(MAKE) db-seed
	@printf '\nSetup complete. Next: make dev\n\n'

dev: ## Start dependency containers and all apps in watch mode
	$(MAKE) deps-up
	pnpm dev

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

typecheck-affected: ## Type-check packages changed vs the merge base
	pnpm exec turbo run typecheck --affected

spell: ## Spell-check code, comments, and docs
	pnpm spell

knip: ## Find unused files, exports, and dependencies
	pnpm knip

layers: ## Assert package layer boundaries (ADR-0002)
	pnpm check:layers

bundle-budget: ## Build apps/web and assert First Load JS budgets
	pnpm --filter @repo/web build
	pnpm --filter @repo/web bundle-budget

openapi-check: ## Regenerate apps/api OpenAPI and fail on drift
	pnpm --filter @repo/api openapi:generate
	@git diff --exit-code -- apps/api/openapi.json || \
		(echo "apps/api/openapi.json is out of date; commit the regenerated file." && exit 1)

## ----------------------------------------------------------------------------
## Tests
## ----------------------------------------------------------------------------

test: ## Run unit tests
	pnpm test

test-affected: ## Unit-test packages changed vs the merge base
	NODE_ENV=test pnpm exec turbo run test:unit --affected

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
		EMAIL_FROM=noreply@example.com \
		RESEND_API_KEY=re_test_replace_me \
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

e2e: ## Playwright E2E against the built web image (CI path)
	-$(COMPOSE_TEST) down --remove-orphans
	-$(COMPOSE_E2E) down --remove-orphans
	$(DOCKER_BUILD) -f docker/web.Dockerfile -t repo-web:local \
		--build-arg NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 \
		--build-arg NEXT_PUBLIC_APP_ENV=test \
		.
	$(COMPOSE_E2E) up -d --no-build --wait
	$(E2E_ENV) pnpm --filter @repo/db exec tsx src/migrate.ts
	$(E2E_ENV) pnpm --filter @repo/db exec tsx src/seeds/run.ts test
	pnpm --filter @repo/web exec playwright install chromium
	E2E_AGAINST_IMAGE=1 $(E2E_ENV) PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 \
		pnpm --filter @repo/web test:e2e
	-$(COMPOSE_E2E) down --remove-orphans

e2e-host: ## Fast local Playwright against deps-up-test + next start
	$(MAKE) deps-up-test
	$(E2E_ENV) pnpm --filter @repo/db exec tsx src/migrate.ts
	$(E2E_ENV) pnpm --filter @repo/web build
	pnpm --filter @repo/web exec playwright install chromium
	$(E2E_ENV) pnpm --filter @repo/web test:e2e

lighthouse: ## Lighthouse CI against a production next start (deps-up-test)
	$(MAKE) deps-up-test
	$(E2E_ENV) pnpm --filter @repo/db exec tsx src/migrate.ts
	$(E2E_ENV) pnpm --filter @repo/web build
	pnpm --filter @repo/web exec playwright install chromium
	CHROME_PATH=$$(pnpm --filter @repo/web exec node --input-type=module -e "import { chromium } from '@playwright/test'; console.log(chromium.executablePath())") \
		$(E2E_ENV) pnpm --filter @repo/web lighthouse

## ----------------------------------------------------------------------------
## Images
## ----------------------------------------------------------------------------

# Provenance/SBOM attestations inflate `docker image inspect` size without
# shipping in the runnable image config we care about for budgets.
DOCKER_BUILD := docker build --provenance=false --sbom=false

images: ## Build web/api/worker/docs images tagged *:local
	$(DOCKER_BUILD) -f docker/web.Dockerfile -t repo-web:local .
	$(DOCKER_BUILD) -f docker/api.Dockerfile -t repo-api:local .
	$(DOCKER_BUILD) -f docker/worker.Dockerfile -t repo-worker:local .
	$(DOCKER_BUILD) -f docker/docs.Dockerfile -t repo-docs:local .
	$(MAKE) image-size


image-size: ## Fail if local app images exceed Phase 11 budgets
	node --experimental-strip-types scripts/check-image-size.ts

## ----------------------------------------------------------------------------
## Local dependencies (Docker)
## ----------------------------------------------------------------------------

deps-up: ## Start Postgres, Redis, MinIO, Mailpit, OTel, Jaeger, Prometheus, Grafana
	$(COMPOSE) up -d postgres redis minio minio-init mailpit jaeger otel-collector prometheus grafana
	@$(MAKE) db-wait
	@until $(COMPOSE) exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 0.5; done

deps-up-test: ## Start ephemeral dependency stack for integration tests
	# Retry once after a clean down — GHA occasionally races host port binds
	# (especially mailpit UI on 55442) on a fresh runner.
	@$(COMPOSE_TEST) up -d postgres redis minio minio-init mailpit || ( \
		$(COMPOSE_TEST) down --remove-orphans; \
		$(COMPOSE_TEST) up -d postgres redis minio minio-init mailpit; \
	)
	@until $(COMPOSE_TEST) exec -T postgres pg_isready -U postgres -d app_test >/dev/null 2>&1; do \
		sleep 0.5; \
	done
	@until $(COMPOSE_TEST) exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 0.5; done

deps-up-test-worker: ## Postgres + Redis + MinIO for worker proofs (no mailpit)
	@$(COMPOSE_TEST) up -d postgres redis minio minio-init || ( \
		$(COMPOSE_TEST) down --remove-orphans; \
		$(COMPOSE_TEST) up -d postgres redis minio minio-init; \
	)
	@until $(COMPOSE_TEST) exec -T postgres pg_isready -U postgres -d app_test >/dev/null 2>&1; do \
		sleep 0.5; \
	done
	@until $(COMPOSE_TEST) exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 0.5; done

deps-down: ## Stop local dependency containers
	-$(COMPOSE) down
	-$(COMPOSE_TEST) down
	-$(COMPOSE_E2E) down --remove-orphans

prod-up: ## Build, migrate, then start the local production-like stack (Traefik on :8080)
	$(COMPOSE_PROD) up -d --build
	@echo "Stack ready: http://localhost:8080 (Traefik dashboard :8081)"

prod-down: ## Stop the local production-like stack
	-$(COMPOSE_PROD) down

## ----------------------------------------------------------------------------
## Hardening (Phase 16) — not part of `make check` / PR CI
## ----------------------------------------------------------------------------

# Host-facing Traefik origin (curl from the laptop / CI runner).
BASE_URL ?= http://localhost:8080
# Origin as seen from k6/ZAP containers (host-gateway; Docker Desktop resolves it).
LOAD_BASE_URL ?= http://host.docker.internal:8080
ZAP_DOCKER_TARGET ?= $(LOAD_BASE_URL)
# Pin the official Grafana image — k6 is a Go runtime, not a Node package.
K6_IMAGE ?= grafana/k6:1.3.0
# Docker Hub — see https://www.zaproxy.org/docs/docker/about/
ZAP_IMAGE ?= zaproxy/zap-stable:latest



# k6 scripts are JS but run inside the k6 binary (Docker). Not executable via pnpm/Node.
define K6_RUN
	docker run --rm \
		--add-host=host.docker.internal:host-gateway \
		-v "$(CURDIR)/perf/k6:/scripts:ro" \
		-e BASE_URL="$(LOAD_BASE_URL)" \
		-e API_KEY \
		-e ORGANIZATION_ID \
		$(K6_IMAGE) run /scripts/$(1)
endef

load: ## Run k6 scenarios via Docker (grafana/k6) against LOAD_BASE_URL
	$(call K6_RUN,health.js)
	$(call K6_RUN,public-api-burst.js)
	$(call K6_RUN,read-heavy.js)
	$(call K6_RUN,write-heavy.js)
	$(call K6_RUN,upload.js)


zap: ## OWASP ZAP baseline against ZAP_DOCKER_TARGET (Traefik on host :8080)
	# /zap/wrk must be writable (ZAP writes reports / plan artifacts there).
	mkdir -p .tmp/zap
	cp "$(CURDIR)/perf/zap/rules.tsv" .tmp/zap/rules.tsv
	docker run --rm \
		--add-host=host.docker.internal:host-gateway \
		-v "$(CURDIR)/.tmp/zap:/zap/wrk" \
		$(ZAP_IMAGE) \
		zap-baseline.py -t "$(ZAP_DOCKER_TARGET)" -c /zap/wrk/rules.tsv -I -m 1 -T 5 \
			--autooff -w /zap/wrk/report.md || \
		{ echo "ZAP exited non-zero — see .tmp/zap/report.md"; exit 1; }





restore-drill: ## pg_dump → scratch DB → migrate → smoke (local Postgres)
	node --experimental-strip-types --env-file=$(CURDIR)/$(ENV_FILE) scripts/restore-drill.ts

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
