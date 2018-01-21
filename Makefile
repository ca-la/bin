SHELL := /bin/bash
.DEFAULT_GOAL := serve-dev

npm_bin = ./node_modules/.bin

# Install dependencies
.PHONY: install
install: preflight
	npm install

.PHONY: serve
serve: preflight
	node index.js

.PHONY: serve-dev
serve-dev:
	env $$(cat .env | xargs) make serve

.PHONY: dev
dev: serve-dev

# Run the test suite
.PHONY: test
test: preflight
	NODE_ENV=test env $$(cat .env | xargs) $(npm_bin)/tape **/*/spec.js | $(npm_bin)/tap-spec

# Interactive console (i.e. to require & explore modules)
.PHONY: console
console: preflight
	env $$(cat .env | xargs) node

.PHONY: release
release:
	$(npm_bin)/cala-release $(type)

.PHONY: validate-migration
validate-migration:
	$(npm_bin)/cala-validate-migration

# Static analysis
.PHONY: lint
lint: preflight
	$(npm_bin)/eslint . --ignore-path .gitignore
	$(npm_bin)/cala-lint-commented-code

.PHONY: preflight
preflight:
	@(which npm > /dev/null) || (echo 'missing dependency: npm'; exit 1)
	@(which node > /dev/null) || (echo 'missing dependency: node'; exit 1)
