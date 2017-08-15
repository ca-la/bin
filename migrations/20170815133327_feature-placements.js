'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_image_placements
  rename to product_design_feature_placements;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  rename to product_design_image_placements;
  `);
};
