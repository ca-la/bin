"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_selected_options
  add column fabric_dye_process_name text,
  add column fabric_dye_process_color text,
  add column fabric_wash_process_name text,
  add column fabric_custom_process_names text[],
  add column garment_component_name text;

alter table product_design_options
  add column setup_cost_cents integer;

alter table product_design_feature_placements
  add column setup_cost_cents integer;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_selected_options
  drop column fabric_dye_process_name,
  drop column fabric_dye_process_color,
  drop column fabric_wash_process_name,
  drop column fabric_custom_process_names,
  drop column garment_component_name;

alter table product_design_options
  drop column setup_cost_cents;

alter table product_design_feature_placements
  drop column setup_cost_cents;
  `);
};
