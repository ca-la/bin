import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE SEQUENCE sku_increment;
ALTER TABLE product_design_variants
  ADD COLUMN sku text;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP SEQUENCE sku_increment;
ALTER TABLE product_design_variants
  DROP COLUMN sku;
  `);
}
