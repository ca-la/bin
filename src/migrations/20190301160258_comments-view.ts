import Knex from 'knex';

export const ANNOTATION_COMMENTS_VIEW_UP = `
CREATE VIEW annotation_comments_view AS
SELECT
  ac.annotation_id AS annotation_id,
  c.*,
  u.name AS user_name,
  u.email AS user_email
FROM comments AS c
LEFT JOIN product_design_canvas_annotation_comments AS ac ON ac.comment_id = c.id
LEFT JOIN users AS u ON u.id = c.user_id
WHERE c.deleted_at IS null
  AND ac.annotation_id IS NOT null;
`;

export function up(knex: Knex): Knex.Raw {
  return knex.raw(ANNOTATION_COMMENTS_VIEW_UP);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW annotation_comments_view;
  `);
}
