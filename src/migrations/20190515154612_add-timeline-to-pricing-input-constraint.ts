import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_inputs
  DROP CONSTRAINT pricing_inputs_constant_id_margin_id_product_material_id_produc,
  ADD CONSTRAINT unique_inputs UNIQUE
    (constant_id,
      margin_id,
      product_material_id,
      product_type_id,
      care_label_id,
      pricing_process_timeline_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_inputs
  DROP CONSTRAINT unique_inputs,
  ADD CONSTRAINT pricing_inputs_constant_id_margin_id_product_material_id_produc UNIQUE
    (constant_id,
      margin_id,
      product_material_id,
      product_type_id,
      care_label_id);
  `);
}
