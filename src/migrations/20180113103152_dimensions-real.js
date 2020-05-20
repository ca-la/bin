"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  alter column production_width_cm
    type real,
  alter column production_height_cm
    type real;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  alter column production_width_cm
    type integer,
  alter column production_height_cm
    type integer;
  `);
};
