SHELL := /bin/bash
.DEFAULT_GOAL := serve-dev

npm_bin = ./node_modules/.bin

# Install dependencies
.PHONY: install
install: preflight
	npm install

.PHONY: clean
clean:
	-rm -r dist

.PHONY: build
build: clean
	$(npm_bin)/tsc

.PHONY: serve
serve: preflight build
	node dist

.PHONY: serve-dev
serve-dev:
	env $$(cat .env | xargs) make serve

.PHONY: dev
dev: serve-dev

# Run the test suite
.PHONY: test
test: preflight build test-ci

.PHONY: test-ci
test-ci: preflight
	NODE_ENV=test env $$(cat .env | xargs) $(npm_bin)/tape dist/**/*/spec.js | $(npm_bin)/tap-spec

# Interactive console (i.e. to require & explore modules)
.PHONY: console
console: preflight
	env $$(cat .env | xargs) node

.PHONY: release
release: lint test
	$(npm_bin)/cala-release $(type)

.PHONY: validate-migration
validate-migration:
	$(npm_bin)/cala-validate-migration

# Static analysis
.PHONY: lint
lint: preflight
	$(npm_bin)/eslint src --ignore-path .gitignore
	$(npm_bin)/tslint -p . 'src/**/*.ts' -t stylish
	$(npm_bin)/cala-lint-commented-code

.PHONY: preflight
preflight:
	@(which npm > /dev/null) || (echo 'missing dependency: npm'; exit 1)
	@(which node > /dev/null) || (echo 'missing dependency: node'; exit 1)
