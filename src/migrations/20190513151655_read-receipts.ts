import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE notifications ADD COLUMN read_at timestamp with time zone;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE notifications DROP COLUMN read_at;
  `);
}
