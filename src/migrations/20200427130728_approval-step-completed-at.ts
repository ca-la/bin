import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_approval_steps
  ADD COLUMN created_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_approval_steps
 DROP COLUMN created_at,
 DROP COLUMN completed_at,
 DROP COLUMN started_at;
  `);
}
