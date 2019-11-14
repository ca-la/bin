import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_bids
  DROP COLUMN project_due_in_ms;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_bids
  ADD COLUMN project_due_in_ms bigint;
  `);
}
