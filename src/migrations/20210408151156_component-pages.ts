import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table components
  add column asset_page_number integer;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table components
  drop column asset_page_number;
  `);
}
