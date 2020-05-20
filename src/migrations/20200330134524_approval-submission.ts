import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE design_approval_submissions (
  id UUID PRIMARY KEY,
  step_id UUID REFERENCES design_approval_steps(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  state text NOT NULL,
  artifact_type text NOT NULL
);

CREATE INDEX design_approval_submissions_step_type
  ON design_approval_submissions (step_id, artifact_type);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX design_approval_submissions_step_type;
DROP TABLE design_approval_submissions;
  `);
}
