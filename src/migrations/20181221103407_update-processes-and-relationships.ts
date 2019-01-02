import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table processes
add column name text not null,
add column created_by uuid references users(id) not null,
add column deleted_at timestamp with time zone;

alter table component_relationships
add column created_by uuid references users(id) not null,
add column deleted_at timestamp with time zone;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table processes
drop column name,
drop column created_by,
drop column deleted_at;

alter table component_relationships
drop column created_by,
drop column deleted_at;
  `);
}
