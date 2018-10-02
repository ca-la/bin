import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table if exists collection_stage_tasks;
drop table if exists collection_stages;

drop table if exists product_design_stage_tasks;
drop table if exists product_design_stages;

create table product_design_stages (
  id uuid primary key,
  design_id uuid references product_designs(id),
  created_at timestamp with time zone not null default now(),
  title text,
  description text
);

create table product_design_stage_tasks (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  design_stage_id uuid references product_design_stages(id),
  task_id uuid references tasks(id)
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table if exists product_design_stage_tasks;
drop table if exists product_design_stages;

create table collection_stages (
  id uuid primary key
);

create table collection_stage_tasks (
  id uuid primary key
);
  `);
}
