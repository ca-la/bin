import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table processes
add column component_type text,
add column ordering integer not null default 0;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table processes
drop column component_type,
drop column ordering;
  `);
}
