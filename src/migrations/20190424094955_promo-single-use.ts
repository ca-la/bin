import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table promo_codes
  add column is_single_use boolean not null default false;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table promo_codes
  drop column is_single_use;
  `);
}
