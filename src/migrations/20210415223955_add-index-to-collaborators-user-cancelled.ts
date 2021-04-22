import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE INDEX collaborators_user_id_cancelled_at_idx ON collaborators(user_id, cancelled_at);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX collaborators_user_id_cancelled_at_idx;
  `);
}
