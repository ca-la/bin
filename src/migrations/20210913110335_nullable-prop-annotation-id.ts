import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE annotation_submissions;

ALTER TABLE design_approval_submissions
  ADD COLUMN annotation_id UUID references product_design_canvas_annotations(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_approval_submissions
 DROP COLUMN annotation_id;

CREATE TABLE annotation_submissions (
  annotation_id UUID references product_design_canvas_annotations(id) NOT NULL,
  submission_id UUID references design_approval_submissions(id) NOT NULL
);
  `);
}
