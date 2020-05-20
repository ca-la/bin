import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE shopify_variants
  DROP CONSTRAINT shopify_variants_variant_upc_fkey;
ALTER TABLE product_design_variants
  DROP CONSTRAINT product_design_variants_universal_product_code_key;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE product_design_variants
  ADD CONSTRAINT product_design_variants_universal_product_code_key UNIQUE(universal_product_code);
ALTER TABLE shopify_variants
  ADD CONSTRAINT shopify_variants_variant_upc_fkey FOREIGN KEY (variant_upc)
    REFERENCES product_design_variants(universal_product_code);
  `);
}
