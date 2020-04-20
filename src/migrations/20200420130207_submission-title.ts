import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_approval_submissions
      ADD COLUMN title TEXT;

    UPDATE design_approval_submissions
      SET title = 'Sample'
    WHERE artifact_type = 'SAMPLE';
    UPDATE design_approval_submissions
      SET title = 'Technical Design'
    WHERE artifact_type = 'TECHNICAL_DESIGN';
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_approval_submissions
      DROP COLUMN title;
  `);
}
