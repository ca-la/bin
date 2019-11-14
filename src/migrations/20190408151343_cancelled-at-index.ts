import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE INDEX collaborators_cancelled_at_idx ON collaborators (cancelled_at DESC NULLS FIRST);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX collaborators_cancelled_at_idx;
  `);
}
