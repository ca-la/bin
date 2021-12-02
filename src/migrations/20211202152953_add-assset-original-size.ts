import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE assets
  ADD COLUMN original_file_size BIGINT;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE assets
  drop COLUMN original_file_size;
  `);
}
