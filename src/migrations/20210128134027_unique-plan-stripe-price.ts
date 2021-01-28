import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE plan_stripe_prices
  ADD CONSTRAINT unique_plan_price UNIQUE (plan_id, stripe_price_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE plan_stripe_prices
 DROP CONSTRAINT unique_plan_price;
  `);
}
