import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE approved_signups
ADD COLUMN consumed_at timestamp with time zone;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE approved_signups
DROP COLUMN consumed_at;
  `);
}
