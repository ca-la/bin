import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE collaborators
      ADD COLUMN team_id uuid REFERENCES teams,
      DROP CONSTRAINT user_id_or_email,
      ADD CONSTRAINT user_or_email_or_team CHECK (
        (
          (user_id IS NOT NULL) AND (user_email IS NULL) AND (team_id IS NULL)
        ) OR (
          (user_id IS NULL) AND (user_email IS NOT NULL) AND (team_id IS NULL)
        ) OR (
          (user_id IS NULL) AND (user_email IS NULL) AND (team_id IS NOT NULL)
        )
      );
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE collaborators
      DROP CONSTRAINT user_or_email_or_team,
      DROP COLUMN team_id,
      ADD CONSTRAINT user_id_or_email CHECK (
        (
          (user_id IS NULL) AND (user_email IS NOT NULL)
        ) OR (
          (user_id IS NOT NULL) AND (user_email IS NULL)
        )
      );
  `);
}
