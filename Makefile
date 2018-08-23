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

.PHONY: serve-built
serve-built: preflight
	@if [ ! -d dist ]; then echo 'Missing built code'; exit 1; fi
	node dist

.PHONY: serve-dev
serve-dev: preflight build
	env $$(cat .env | xargs) make serve-built

.PHONY: dev
dev: serve-dev

# Run the test suite
.PHONY: test
test: preflight build
	NODE_ENV=test env $$(cat .env | xargs) $(npm_bin)/tape "dist/**/*spec.js" | $(npm_bin)/tap-difflet --pessimistic

.PHONY: test-ci
test-ci: preflight
	mkdir -p ./reports
	NODE_ENV=test env $$(cat .env | xargs) $(npm_bin)/tape "dist/**/*spec.js" | $(npm_bin)/tap-xunit > ./reports/tape.xml

# Interactive console (i.e. to require & explore modules)
.PHONY: console
console: preflight
	env $$(cat .env | xargs) node

.PHONY: release
release: lint test
	$(npm_bin)/cala-release $(type)

.PHONY: validate-migration
validate-migration: build
	$(npm_bin)/cala-validate-migration

# Static analysis
.PHONY: lint
lint: preflight
	$(npm_bin)/eslint src --ignore-path .gitignore
	$(npm_bin)/tslint -p . 'src/**/*.ts' -t stylish
	$(npm_bin)/cala-lint-commented-code

.PHONY: lint-ci
lint-ci: preflight
	mkdir -p ./reports
	$(npm_bin)/eslint src --ignore-path .gitignore --format junit --output-file ./reports/eslint.xml
	$(npm_bin)/tslint -p . 'src/**/*.ts' -t junit > ./reports/tslint.xml
	$(npm_bin)/cala-lint-commented-code

.PHONY: preflight
preflight:
	@(which npm > /dev/null) || (echo 'missing dependency: npm'; exit 1)
	@(which node > /dev/null) || (echo 'missing dependency: node'; exit 1)

.PHONY: publish-preflight
publish-preflight:
	@if [ ! -d dist ]; then echo 'Missing built code'; exit 1; fi
	[[ ! -s \"$$(git rev-parse --git-dir)/shallow\" ]] || git fetch --unshallow
	git branch -D deploy-branch || true
	git checkout --orphan deploy-branch
	git add -f dist
	git commit -m '[ci skip] add built code'

.PHONY: publish-stg
publish-stg: publish-preflight
	$(npm_bin)/cala-validate-deployment-readiness staging dist/migrations
	git push https://heroku:$$HEROKU_API_KEY@git.heroku.com/cala-api-stg.git deploy-branch:master -f
	git checkout master

.PHONY: publish-prod
publish-prod: publish-preflight
	$(npm bin)/cala-validate-deployment-readiness production dist/migrations
	git push https://heroku:$$HEROKU_API_KEY@git.heroku.com/cala-api-prod.git deploy-branch:master -f
	git push https://heroku:$$HEROKU_API_KEY@git.heroku.com/cala-api-demo.git deploy-branch:master -f
	git checkout master
