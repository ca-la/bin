'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  add column production_width_cm integer,
  add column production_height_cm integer;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  drop column production_width_cm,
  drop column production_height_cm;
  `);
};
