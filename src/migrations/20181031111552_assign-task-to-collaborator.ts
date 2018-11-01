import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table if exists user_tasks;

drop table if exists collaborator_tasks;

create table collaborator_tasks (
  created_at timestamp with time zone not null default now(),
  collaborator_id uuid references collaborators(id),
  task_id uuid references tasks(id),
  primary key (task_id, collaborator_id)
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
create table if not exists user_tasks (id uuid primary key);

drop table if exists collaborator_tasks;
  `);
}
