import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_approval_steps ADD COLUMN due_at TIMESTAMP WITH TIME ZONE;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_approval_steps DROP COLUMN due_at;
  `);
}
