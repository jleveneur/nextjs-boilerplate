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
        typecheck spell knip layers test test-scripts changeset clean clean-all

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

## ----------------------------------------------------------------------------
## Tests
## ----------------------------------------------------------------------------

test: ## Run unit tests
	pnpm test

test-scripts: ## Test the repo's own tooling scripts
	pnpm test:scripts

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
