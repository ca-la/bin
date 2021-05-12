import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_quotes
  ADD COLUMN production_fee_cents INTEGER NOT NULL DEFAULT 0;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_quotes
 DROP COLUMN production_fee_cents;
  `);
}
