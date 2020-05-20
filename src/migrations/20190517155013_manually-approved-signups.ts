import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE approved_signups
ADD COLUMN is_manually_approved boolean;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE approved_signups
DROP COLUMN is_manually_approved;
  `);
}
