import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table credit_transactions (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  given_to uuid references users(id) not null,
  created_by uuid references users(id) not null,
  credit_delta_cents bigint not null,
  description text not null,
  expires_at timestamp with time zone
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table credit_transactions;
  `);
}
