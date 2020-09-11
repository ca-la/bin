import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_cost_inputs
  ADD COLUMN minimum_order_quantity INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT moq_greater_than_zero CHECK (minimum_order_quantity > 0);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_cost_inputs
 DROP CONSTRAINT moq_greater_than_zero,
 DROP COLUMN minimum_order_quantity;
  `);
}
