import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE team_users
  ADD COLUMN id UUID PRIMARY KEY,
  ADD COLUMN role TEXT NOT NULL,
  ADD CONSTRAINT unique_team_user UNIQUE (team_id, user_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE team_users
 DROP CONSTRAINT unique_team_user,
 DROP COLUMN role,
 DROP COLUMN id;
  `);
}
