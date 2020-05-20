import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_bids
  ADD COLUMN due_date timestamp with time zone;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_bids
  DROP COLUMN due_date;
  `);
}
