import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE notifications
      ADD COLUMN approval_step_id UUID REFERENCES design_approval_steps;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE notifications
      DROP COLUMN approval_step_id;
  `);
}
