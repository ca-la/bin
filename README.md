# cala-api

The CALA API. Powers the website (https://ca.la) and mobile app.

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

You'll need several environment variables set to correctly run the API. The
easiest way to set these is probably to dump them from Heroku — the development
server will read them from a `.env` file if present.

```bash
$ heroku config -s --app cala-api-prod > .env
```

## Usage

### Local development server

```bash
$ make serve-dev
```

### Production server

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

```bash
$ bin/create-migration  # Create a new migration
$ bin/migrate-local     # Migrate local DBs to latest schema
$ bin/rollback-lock     # Roll back latest local migration
$ bin/migrate-prod      # Migrate production DB. This should be performed after
                        # a pull request is approved, and before it's merged.
                        # Any code in a pull request must be able to function
                        # both before and after its corresponding migration is
                        # run to avoid downtime.
```

For advanced usage, see [knexjs.org](http://knexjs.org/#Migrations)

