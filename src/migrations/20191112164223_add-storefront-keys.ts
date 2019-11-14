import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table storefront_users
  alter column storefront_id set not null,
  alter column user_id set not null,
  add constraint storefront_users_pkey primary key (storefront_id, user_id);

alter table storefront_integration_tokens
  add column id uuid primary key;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table storefront_users
  drop constraint storefront_users_pkey,
  alter column storefront_id drop not null,
  alter column user_id drop not null;

alter table storefront_integration_tokens
  drop column id;
  `);
}
