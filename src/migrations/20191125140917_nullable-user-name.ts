import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE users
  ALTER COLUMN name DROP NOT NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE users
  ALTER COLUMN name SET NOT NULL;
  `);
}
