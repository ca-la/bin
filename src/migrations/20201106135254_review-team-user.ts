import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_approval_submissions
  ADD COLUMN team_user_id UUID REFERENCES team_users (id);

ALTER TABLE design_approval_steps
  ADD COLUMN team_user_id UUID REFERENCES team_users (id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_approval_submissions
 DROP COLUMN team_user_id;

ALTER TABLE design_approval_steps
 DROP COLUMN team_user_id;
  `);
}
