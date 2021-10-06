import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE INDEX variants_sku_partial_idx
  ON product_design_variants (id, sku)
WHERE sku IS NOT NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX variants_sku_partial_idx;
  `);
}
