import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_events
      ADD COLUMN approval_step_id UUID REFERENCES design_approval_steps(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_events
      DROP COLUMN approval_step_id;
  `);
}
