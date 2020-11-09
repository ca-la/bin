# cala-api

The CALA REST API.

Written in TypeScript, running on node.js and PostgreSQL. Some older code is
written in vanilla JavaScript.

## Development

First, run `bin/bootstrap` for an interactive walkthrough to set up your local
development environment. You'll have to get a few things in place (see below)
but this will help identify what's missing.

**Prerequisites**
- Node 10.15.0
- npm 6.4.1
- Postgres 10.6
- heroku-cli 7.19.4
- findutils 4.6.0
  - If you install these using homebrew, make sure you add the homebrew executables to your `$PATH`
- A local [SQS server](https://github.com/ca-la/sqs-local).
- You'll need several environment variables set to correctly run the API. These
are available as a note named `CALA API .env file (development)` in the engineering
group in 1Password. `CALA API .test.env file (development)`.
- You'll also need an environment variable set called `NPM_TOKEN` with an npm token to install
private packages from our npm org. For example in your .bash_profile have a line with
`export NPM_TOKEN=00000000-0000-0000-0000-000000000000` with your token. A new token can be
generated with `npm token create --read-only`

```bash
$ npm install
$ bin/dev
```

### Initial Setup

#### Initial Migrations

After initial setup, you will need to migrate the newly created databases:

```bash
$ bin/migrate local
```

For more details about Migrations, see the section titled
[Migrations](#Migrations)

#### Seeding databases & running scripts

There are also a number of scripts that provide seed data in the `src/scripts`
directory.

```bash
$ bin/run <environment> src/scripts/<TARGET SCRIPT FILENAME>
```

## Deployment

The `main` and `production` branches are automatically deployed by CircleCI:

Branch | Heroku App | URL | Build Status
------ | ---------- | --- | ------------
`main` | `cala-api-stg` | https://api-stg.ca.la | [![CircleCI](https://circleci.com/gh/ca-la/api/tree/main.svg?style=svg&circle-token=3608566fd37aaa8e46dabc26eb91799152d5b834)](https://circleci.com/gh/ca-la/api/tree/main)
`production` | `cala-api-prod` | https://api.ca.la | [![CircleCI](https://circleci.com/gh/ca-la/api/tree/production.svg?style=svg&circle-token=3608566fd37aaa8e46dabc26eb91799152d5b834)](https://circleci.com/gh/ca-la/api/tree/production)

To tag off and release a new version to production, run the release script:

```bash
$ bin/release patch    # 0.0.x - bug fixes
$ bin/release minor    # 0.x.0 - new features or changes
$ bin/release major    # x.0.0 - large, backwards-incompatible changes
```

## Usage

Check out the `bin/` directory to explore available tools and CLI entry points
for API features. The most common ones are documented below:

### Testing / Linting

```bash
$ bin/lint
$ bin/test      # Will build and lint the app, no need to npm run lint && npm run test
$ bin/coverage  # Will run tests and output coverage
```

### Run a single test file

```bash
$ bin/tt src/routes/users/spec.ts
```

### Migrations

To run staging/production migrations, you'll need the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli).

Staging database migrations should be performed immediately after a pull request
is merged. Please paste the output of `bin/migrate staging` into the #eng
channel in Slack.

When a production deployment is approved, please run production migrations
(`bin/migrate production`) immediately prior to running the release script.
Again, paste the output into Slack for visibility.

All migrations **must** be able to work both with the currently-deployed
application code, and with the code that will be deployed in the associated pull
request. This avoids any downtime in between the two, particularly if there are
issues with the application code deployment.

This means that some types of migrations - e.g. adding a new `not null` column
that the application code needs to populate - should be done in a two step
deploy; first add the column, then deploy the application code, then add the
`not null` constraint.

```bash
$ bin/create_migration some-descriptive-name  # Create a new migration
$ bin/migrate local                           # Migrate local DBs to latest schema
$ bin/migrate local rollback                  # Roll back latest migration on local DBs
$ bin/migrate staging                         # Migrate staging DB
$ bin/migrate production                      # Migrate production/demo DB
```

For advanced usage, see [knexjs.org](http://knexjs.org/#Migrations).

A good sanity-check for testing migrations locally is the `bin/validate_migration`
script, which gives a summary of the effects of the migration and any unexpected
side-effects after rolling it back. Note that this should be run before migrating
locally. You can roll back the migration to get an accurate result.

Migration rollbacks are an imperfect tool, and are never used in
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
