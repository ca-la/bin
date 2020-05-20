"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_options
  rename column preferred_cost_unit to preferred_length_unit;

alter table product_design_options
  add column per_meter_cost_cents integer,
  add column composition text,
  add column roll_width_cm real,
  add column preferred_width_unit text,
  add column weave_type text,
  add column end_use text,
  add column origin_country text,
  add column care_instructions text,
  add column ships_from_city text,
  add column ships_from_country text,
  add column tests_and_certifications text,
  add column description text,
  add column is_pfd boolean default false,
  add column color text,
  add column lead_time_hours integer,
  add column vendor_web_url text;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_options
  rename column preferred_length_unit to preferred_cost_unit;

alter table product_design_options
  drop column per_meter_cost_cents,
  drop column composition,
  drop column roll_width_cm,
  drop column preferred_width_unit,
  drop column weave_type,
  drop column end_use,
  drop column origin_country,
  drop column care_instructions,
  drop column ships_from_city,
  drop column ships_from_country,
  drop column tests_and_certifications,
  drop column description,
  drop column is_pfd,
  drop column color,
  drop column lead_time_hours,
  drop column vendor_web_url;
  `);
};
