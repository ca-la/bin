import Knex from 'knex';
export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX collaborators_unique_id;
  `);
}
export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE UNIQUE INDEX collaborators_unique_id
    ON collaborators (design_id, user_id)
 WHERE (deleted_at IS NULL);
  `);
}
