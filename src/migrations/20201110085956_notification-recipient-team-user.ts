import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE notifications
  ADD COLUMN recipient_team_user_id UUID REFERENCES team_users (id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE notifications
 DROP COLUMN recipient_team_user_id;
  `);
}
