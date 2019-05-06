import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE resolve_accounts (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone default null,
  user_id uuid references users(id) not null,
  resolve_customer_id text not null
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE resolve_accounts;
  `);
}
