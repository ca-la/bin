SHELL := /bin/bash
.PHONY: install serve test lint preflight

# Install dependencies
install: preflight
	npm install

serve: preflight
	node index.js

serve-dev:
	env $$(cat .env | xargs) make serve

# Run the test suite
test: preflight
	NODE_ENV=test env $$(cat .env | xargs) $$(npm bin)/tape **/*/spec.js | $$(npm bin)/tap-spec

# Static analysis
lint: preflight
	$$(npm bin)/eslint . --ignore-path .gitignore

preflight:
	@(which npm > /dev/null) || (echo 'missing dependency: npm'; exit 1)
	@(which node > /dev/null) || (echo 'missing dependency: node'; exit 1)
