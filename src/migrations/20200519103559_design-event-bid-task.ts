import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_events
      ADD COLUMN task_type_id uuid;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_events
      DROP COLUMN task_type_id;
  `);
}
