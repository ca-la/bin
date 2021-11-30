import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE product_design_canvas_annotations
      ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE product_design_canvas_annotations
      DROP COLUMN resolved_at;
  `);
}
