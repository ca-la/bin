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

- node.js (version 8.x)
- npm (version 3.x)
- postgresql

The default configuration uses 2 local databases - one for running tests
against, one for serving persistent data. To create these locally:

```bash
$ createdb cala
$ createdb cala-test
```

After you create the tables you will need to migrate them. This can be done with
the `bin/migrate-local` command outlined in the Migrations section.

You'll need several environment variables set to correctly run the API. These
are available as a note named `CALA API .env file (development)` in the engineering
group in 1Password — the development server will read them from a `.env` file if
present.

## Deployment

The `master` and `production` branches are automatically deployed by CircleCI:

Branch | Heroku App | URL | Build Status
------ | ---------- | --- | ------------
`master` | `cala-api-stg` | https://api-stg.ca.la | [![CircleCI](https://circleci.com/gh/ca-la/api/tree/master.svg?style=svg&circle-token=3608566fd37aaa8e46dabc26eb91799152d5b834)](https://circleci.com/gh/ca-la/api/tree/master)
`production` | `cala-api-prod` | https://api.ca.la | [![CircleCI](https://circleci.com/gh/ca-la/api/tree/production.svg?style=svg&circle-token=3608566fd37aaa8e46dabc26eb91799152d5b834)](https://circleci.com/gh/ca-la/api/tree/production)

To tag off and release a new version to production, run the release script:

```bash
$ make release type=patch    # 0.0.x - bug fixes
$ make release type=minor    # 0.x.0 - new features or changes
$ make release type=major    # x.0.0 - large, backwards-incompatible changes
```


## Usage

Many common actions have corresponding Make targets; dig into the Makefile for
more examples.

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

Staging and production database migrations should be performed after a pull
request is reviewed, and before it's merged.

All migrations **must** be able to work both with the currently-deployed
application code, and with the code that will be deployed in the associated pull
request. This avoids any downtime in between the two, particularly if there are
issues with the application code deployment.

This means that some types of migrations - e.g. adding a new `not null` column
that the application code needs to populate - should be done in a two step
deploy; first add the column, then deploy the application code, then add the
`not null` constraint.

```bash
$ bin/create-migration  # Create a new migration
$ bin/migrate-local     # Migrate local DBs to latest schema
$ bin/rollback-local    # Roll back latest local migration
$ bin/migrate-stg       # Migrate staging DB
$ bin/migrate-prod      # Migrate production DB
```

For advanced usage, see [knexjs.org](http://knexjs.org/#Migrations).

A good sanity-check for testing migrations locally is the `make
validate-migration` script, which gives a summary of the effects of the
migration and any unexpected side-effects after rolling it back.

Migration rollbacks are an imperfect tool, and are almost never used in
production. They make it easy to move back and forth in the local migration
history the same way we can for code commits, but it's not reasonable to expect
them to preserve important data when rolled back and forward again. See
[You Can't Have a Rollback Button](https://blog.skyliner.io/you-cant-have-a-rollback-button-83e914f420d9).

## Gotchas / Future Considerations

Most things should "just work" indefinitely without much human maintenance.
Exceptions include:

- Some heavy tasks (image processing/older email notifications/etc) happen in
  the main API thread. Newer notifications are pushed into a worker queue and
  processed by a [separate service](https://github.com/ca-la/notifications), so we
  should move things there or to similar systems as this becomes a bottleneck.
- Not all endpoints that could potentially return large arrays support or
  require `limit`/`offset` parameters. Changing this will require updating
  clients as well.
