import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    CREATE TABLE product_design_samples (
      design_id UUID REFERENCES product_designs UNIQUE NOT NULL,
      variant_id UUID REFERENCES product_design_variants NOT NULL
    );
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    DROP TABLE product_design_samples;
  `);
}
