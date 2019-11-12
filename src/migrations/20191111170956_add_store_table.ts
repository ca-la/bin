import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table storefronts (
  id uuid primary key,
  name text not null,

  created_at timestamp with time zone not null default now(),
  created_by uuid references users(id) not null,
  deleted_at timestamp with time zone
);

create table storefront_users (
  storefront_id uuid references storefronts(id),
  user_id uuid references users(id)
);

create table storefront_integration_tokens (
  provider_name text not null,
  storefront_id uuid references storefronts(id),
  token text not null,

  created_at timestamp with time zone not null default now(),
  created_by uuid references users(id) not null,
  deleted_at timestamp with time zone
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table storefront_users;
drop table storefront_integration_tokens;
drop table storefronts;
  `);
}
