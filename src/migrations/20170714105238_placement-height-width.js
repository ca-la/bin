'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_image_placements
  drop column scale,
  add column width integer not null,
  add column height integer not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_image_placements
  add column scale real not null default 1;
  `);
};
