"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_images
  alter column mime_type set not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_images
  alter column mime_type drop not null;
  `);
};
