# cala-api


Stack:

- node
- postgres
- koa
- knex
- tape
- eslint

## Prerequisites

- node.js (v6+)
- postgresql

The default configuration uses 2 local databases - one for running tests
against, one for serving persistent data. To create these locally:

```bash
$ createdb cala
$ createdb cala-test
```

## Usage

### Local development server

```bash
$ make serve
```

### Testing / Linting

```bash
$ make test
$ make lint
```

### Run a single test file

```bash
$ bin/tt routes/users/spec.js
```

### Migrations

See [knexjs.org](http://knexjs.org/#Migrations)

```bash
$ bin/migrate-local   # Migrate local DBs to latest schema
$ $(npm bin)/knex migrate:rollback
$ $(npm bin)/knex migrate:make my-migration-name
```
