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

A good sanity-check for testing migrations locally is to migrate, rollback, and
migrate again; this verifies that the rollback leaves things in a compatible
state.

For advanced usage, see [knexjs.org](http://knexjs.org/#Migrations)

## Gotchas / Future Considerations

Most things should "just work" indefinitely without much human maintenance.
Exceptions include:

- The system will run out of "unassigned" referral codes at some point. To
  create new referral codes, we need to first generate a list of codes (can be
  any random string), then use the Shopify "bulk discount" app to create them on
  the Shopify store, and lastly populate the `unassigned_referral_codes` table
  in the database. I'm not aware of a way to automate this, as the Shopify
  referral code API requires a Plus account. As of 2017-02-14 we have ~2800
  unassigned codes remaining.
- Once we have more than 250 orders in place, customers will not receive
  referral credits for orders older than the most recent 250. See
  `ShopifyService.getRedemptionCount`. The solution here probably involves
  pagination.
- The process of "cashing out" a referral credit is currently manual (for the
  same reason as point #1 above). If a customer has e.g. $50 in credit, they
  will be prompted to email `hi@ca.la` to redeem it, at which point we should
  create a unique one-time promo code for them and send it directly to them to
  use.
- Image processing and email dispatching both go through the main API thread.
  These are great candidates to break off into a worker queue and/or a separate
  service once we hit scaling limitations.
    - update 2017/3 - experimenting with a new Go service -
      [scanner](https://github.com/ca-la/scanner)
- We're on a small Heroku database at the moment, with a 10k row limit. We'll
  need to upgrade this once we get close to that limit. They'll notify us when
  that time comes. Probably easiest to stick with Heroku Postgres, but we could
  consider RDS also.
