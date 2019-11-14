import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE users
  ADD COLUMN locale TEXT NOT NULL DEFAULT 'en-US';
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE users
  DROP COLUMN locale;
  `);
}
