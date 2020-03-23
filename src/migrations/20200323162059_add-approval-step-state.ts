import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_approval_steps
  ADD COLUMN state text NOT NULL DEFAULT 'UNSTARTED';
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_approval_steps
  DROP COLUMN state;
  `);
}
