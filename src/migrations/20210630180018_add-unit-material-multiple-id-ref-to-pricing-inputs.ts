import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_inputs
  ADD COLUMN pricing_unit_material_multiple_id uuid references pricing_unit_material_multiples(id);

ALTER TABLE pricing_cost_inputs
  ADD COLUMN unit_material_multiple_version integer;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_inputs
  DROP COLUMN pricing_unit_material_multiple_id;
ALTER TABLE pricing_cost_inputs
  DROP COLUMN unit_material_multiple_version;
  `);
}
