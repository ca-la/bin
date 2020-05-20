import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_cost_inputs
  ADD COLUMN processes_version integer,
  ADD COLUMN constants_version integer,
  ADD COLUMN margin_version integer,
  ADD COLUMN product_materials_version integer,
  ADD COLUMN care_labels_version integer,
  ADD COLUMN process_timelines_version integer,
  ADD COLUMN product_type_version integer;

UPDATE pricing_cost_inputs SET processes_version = (SELECT MAX(version) FROM pricing_processes);
UPDATE pricing_cost_inputs SET constants_version = (SELECT MAX(version) FROM pricing_constants);
UPDATE pricing_cost_inputs SET margin_version = (SELECT MAX(version) FROM pricing_margins);
UPDATE pricing_cost_inputs SET product_materials_version = (SELECT MAX(version) FROM pricing_product_materials);
UPDATE pricing_cost_inputs SET care_labels_version = (SELECT MAX(version) FROM pricing_care_labels);
UPDATE pricing_cost_inputs SET process_timelines_version = (SELECT MAX(version) FROM pricing_process_timelines);
UPDATE pricing_cost_inputs SET product_type_version = (SELECT MAX(version) FROM pricing_product_types);


ALTER TABLE pricing_cost_inputs
  ALTER COLUMN processes_version SET NOT NULL,
  ALTER COLUMN constants_version SET NOT NULL,
  ALTER COLUMN margin_version SET NOT NULL,
  ALTER COLUMN product_materials_version SET NOT NULL,
  ALTER COLUMN care_labels_version SET NOT NULL,
  ALTER COLUMN process_timelines_version SET NOT NULL,
  ALTER COLUMN product_type_version SET NOT NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_cost_inputs
  DROP COLUMN processes_version,
  DROP COLUMN constants_version,
  DROP COLUMN margin_version,
  DROP COLUMN product_materials_version,
  DROP COLUMN care_labels_version,
  DROP COLUMN process_timelines_version,
  DROP COLUMN product_type_version;
  `);
}
