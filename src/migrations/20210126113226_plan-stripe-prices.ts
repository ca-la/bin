import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE plan_stripe_prices (
  plan_id UUID REFERENCES plans (id) NOT NULL,
  stripe_price_id TEXT NOT NULL
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE plan_stripe_prices;
  `);
}
