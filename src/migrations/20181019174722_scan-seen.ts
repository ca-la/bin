import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table scans
  add column is_started boolean not null default false;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table scans
  drop column is_started;
  `);
}
