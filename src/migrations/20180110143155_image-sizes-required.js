"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_images
  alter column original_height_px set not null,
  alter column original_width_px set not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_images
  alter column original_height_px drop not null,
  alter column original_width_px drop not null;
  `);
};
