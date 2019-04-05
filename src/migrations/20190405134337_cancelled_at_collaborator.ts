import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE collaborators
ADD COLUMN cancelled_at timestamp with time zone;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE collaborators
DROP COLUMN cancelled_at;
  `);
}
