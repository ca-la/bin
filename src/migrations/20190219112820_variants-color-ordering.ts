import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE product_design_variants
ADD COLUMN color_name_position integer NOT NULL DEFAULT 0;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE product_design_variants
DROP COLUMN color_name_position;
  `);
}
