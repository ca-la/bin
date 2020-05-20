"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  add column text_size real;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  drop column text_size;
  `);
};
