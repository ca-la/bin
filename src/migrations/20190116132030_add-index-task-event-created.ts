import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE INDEX task_events_created_at_desc_index ON task_events (created_at DESC);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX task_events_created_at_desc_index;
  `);
}
