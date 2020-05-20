import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE approved_signups (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  email text unique not null,
  first_name text not null,
  last_name text not null
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE approved_signups;
  `);
}
