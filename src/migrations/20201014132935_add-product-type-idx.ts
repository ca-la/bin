import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE INDEX pricing_product_type_idx ON pricing_product_types (version, name, complexity, minimum_units);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX pricing_product_type_idx;
  `);
}
