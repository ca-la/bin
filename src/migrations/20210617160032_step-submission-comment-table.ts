import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE submission_comments (
  submission_id UUID NOT NULL REFERENCES design_approval_submissions (id),
  comment_id UUID NOT NULL REFERENCES comments (id)
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE submission_comments;
  `);
}
