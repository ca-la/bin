"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_images
  add column original_height_px integer,
  add column original_width_px integer;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_images
  drop column original_height_px,
  drop column original_width_px;
  `);
};
