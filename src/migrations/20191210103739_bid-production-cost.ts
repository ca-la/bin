import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_bids
  ADD COLUMN bid_price_production_only_cents INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT price_greater_than_production
           CHECK (bid_price_cents >= bid_price_production_only_cents);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_bids
  DROP CONSTRAINT price_greater_than_production,
  DROP COLUMN bid_price_production_only_cents;
  `);
}
