import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW annotation_comments_view;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE VIEW annotation_comments_view AS
SELECT
  ac.annotation_id AS annotation_id,
  c.id AS id,
  c.created_at AS created_at,
  c.deleted_at AS deleted_at,
  c.text AS text,
  c.parent_comment_id AS parent_comment_id,
  c.user_id AS user_id,
  c.is_pinned AS is_pinned,
  u.name AS user_name,
  u.email AS user_email
FROM comments AS c
LEFT JOIN product_design_canvas_annotation_comments AS ac ON ac.comment_id = c.id
LEFT JOIN users AS u ON u.id = c.user_id
WHERE c.deleted_at IS null
  AND ac.annotation_id IS NOT null;
  `);
}
