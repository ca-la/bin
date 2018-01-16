'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_images
  add column mime_type text;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_images
  drop column mime_type;
  `);
};
