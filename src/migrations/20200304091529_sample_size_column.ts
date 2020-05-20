import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    DROP TABLE product_design_samples;

    ALTER TABLE product_design_variants
      ADD COLUMN is_sample BOOLEAN DEFAULT FALSE NOT NULL,
      ADD CONSTRAINT non_zero_sample CHECK (
        NOT is_sample OR (is_sample AND units_to_produce > 0)
      );

    CREATE UNIQUE INDEX unique_design_sample ON product_design_variants (design_id, is_sample)
      WHERE is_sample = true;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    CREATE TABLE product_design_samples (
      design_id UUID REFERENCES product_designs UNIQUE NOT NULL,
      variant_id UUID REFERENCES product_design_variants NOT NULL
    );

    DROP INDEX unique_design_sample;

    ALTER TABLE product_design_variants
      DROP COLUMN is_sample;
  `);
}
