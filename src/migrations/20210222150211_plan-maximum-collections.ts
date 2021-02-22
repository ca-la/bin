import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE plans
      ADD COLUMN maximum_collections integer;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE plans
      DROP COLUMN maximum_collections;
  `);
}
