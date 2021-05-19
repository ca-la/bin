import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE INDEX idx_comments_parent_partial
  ON comments (parent_comment_id, created_at)
WHERE deleted_at IS NULL;

CREATE INDEX idx_comment_attachments_comment ON comment_attachments (comment_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX idx_comments_parent_partial;
DROP INDEX idx_comment_attachments_comment;
  `);
}
