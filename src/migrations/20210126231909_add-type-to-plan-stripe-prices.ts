import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE plan_stripe_prices
 ADD COLUMN type TEXT NOT NULL DEFAULT 'BASE_COST';
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE plan_stripe_prices
 DROP COLUMN type;
  `);
}
