import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    CREATE TABLE design_approval_step_tasks (
      approval_step_id uuid REFERENCES design_approval_steps NOT NULL,
      task_id uuid REFERENCES tasks NOT NULL
    );
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    DROP TABLE design_approval_step_tasks;
  `);
}
