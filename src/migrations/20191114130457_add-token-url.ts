import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table storefront_integration_tokens
  add column base_url text;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table storefront_integration_tokens
  drop column base_url;
  `);
}
