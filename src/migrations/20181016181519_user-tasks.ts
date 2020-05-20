import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table user_tasks (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  task_id uuid references tasks(id) not null,
  user_id uuid references users(id) not null,
  unique (task_id, user_id)
);
`);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table user_tasks;
`);
}
