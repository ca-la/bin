import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table tasks (
  id uuid primary key,
  created_at timestamp with time zone not null default now()
);

create table task_events (
  id uuid primary key,
  task_id uuid references tasks(id),
  created_at timestamp with time zone not null default now(),
  created_by uuid references users(id),
  title text,
  status text,
  due_date timestamp with time zone
);

create table collection_stages (
  id uuid primary key,
  collection_id uuid references collections(id),
  created_at timestamp with time zone not null default now(),
  title text
);

create table collection_stage_tasks (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  collection_stage_id uuid references collection_stages(id),
  task_id uuid references tasks(id)
);
`);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table collection_stage_tasks;
drop table collection_stages;
drop table task_events;
drop table tasks;
  `);
}
