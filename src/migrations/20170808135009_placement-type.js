"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_image_placements
  add column type text;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_image_placements
  drop column type;
  `);
};
