import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    alter table tasks drop column ordering;
    alter table task_events add column ordering integer not null default 0;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    alter table tasks add column ordering integer not null default 0;
    alter table task_events drop column ordering;
  `);
}
