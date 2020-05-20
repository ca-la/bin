import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE files (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  created_by uuid references users(id) not null,
  mime_type text not null,
  name text,
  upload_completed_at timestamp with time zone default null
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE files;
  `);
}
