import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE notifications ADD COLUMN approval_submission_id UUID REFERENCES design_approval_submissions(id);
    ALTER TABLE design_approval_submissions DROP COLUMN user_id;
    ALTER TABLE design_approval_submissions ADD COLUMN collaborator_id UUID REFERENCES collaborators(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE notifications DROP COLUMN approval_submission_id;
    ALTER TABLE design_approval_submissions DROP COLUMN collaborator_id;
    ALTER TABLE design_approval_submissions
      ADD COLUMN user_id UUID REFERENCES users(id);
  `);
}
