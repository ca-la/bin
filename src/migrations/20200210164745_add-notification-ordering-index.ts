import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE INDEX notifications_created_at_partial_idx ON notifications (recipient_user_id, created_at, id)
 WHERE deleted_at IS NULL
   AND type NOT IN (
    'ANNOTATION_CREATE',
    'create-section',
    'create-selected-option',
    'DESIGN_UPDATE',
    'delete-section',
    'delete-selected-option',
    'SECTION_CREATE',
    'SECTION_DELETE',
    'SECTION_UPDATE',
    'update-design',
    'update-feature-placement',
    'update-section',
    'update-selected-option'
  );
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX notifications_created_at_partial_idx;
  `);
}
