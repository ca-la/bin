import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table components (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  parent_id uuid references components(id)
);

create table processes (
  id uuid primary key,
  created_at timestamp with time zone not null default now()
);

create table component_relationships (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  source_component_id uuid not null references components(id),
  target_component_id uuid not null references components(id),
  process_id uuid not null references processes(id),
  relative_x integer not null,
  relative_y integer not null
);

create table templates (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  title text not null,
  description text not null
);

create table template_components (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  template_id uuid not null references templates(id),
  component_id uuid not null references components(id)
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table template_components;
drop table templates;
drop table component_relationships;
drop table processes;
drop table components;
  `);
}
