import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE team_users
  ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;

CREATE INDEX team_users_partial_idx
    ON team_users(team_id, user_id, user_email) WHERE deleted_at IS NULL;

CREATE INDEX user_teams_partial_idx
    ON team_users(user_id, user_email) WHERE deleted_at IS NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX team_users_partial_idx;
DROP INDEX user_teams_partial_idx;

ALTER TABLE team_users
 DROP COLUMN deleted_at,
 DROP COLUMN created_at,
 DROP COLUMN updated_at;
  `);
}
