import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_cost_inputs
  ADD COLUMN expires_at timestamp with time zone;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_cost_inputs
  DROP COLUMN expires_at;
  `);
}
