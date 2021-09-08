import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE submissions (
  id UUID PRIMARY KEY,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID references users(id),

  state TEXT NOT NULL,
  title TEXT NOT NULL,
  collaborator_id UUID references collaborators(id),
  team_user_id UUID references team_users(id)
);

CREATE TABLE annotation_submissions (
  annotation_id UUID references product_design_canvas_annotations(id) NOT NULL,
  submission_id UUID references submissions(id) NOT NULL
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE annotation_submissions;
DROP TABLE submissions;
  `);
}
