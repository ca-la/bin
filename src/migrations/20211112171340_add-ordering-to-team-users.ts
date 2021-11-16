import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE team_users
    ADD COLUMN team_ordering INTEGER NOT NULL DEFAULT 0;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE team_users
    DROP COLUMN team_ordering;
  `);
}
