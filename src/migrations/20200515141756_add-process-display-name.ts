import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_processes
  ADD COLUMN display_name TEXT;

UPDATE pricing_processes
   SET display_name = lower(regexp_replace(name, '_', ' '))
 WHERE display_name IS NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_processes
 DROP COLUMN display_name;
  `);
}
