import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE notifications
      ADD COLUMN team_id UUID REFERENCES teams;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE notifications
      DROP COLUMN team_id;
  `);
}
