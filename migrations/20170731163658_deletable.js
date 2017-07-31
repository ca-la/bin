'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  add column deleted_at timestamp with time zone;

alter table product_design_images
  add column deleted_at timestamp with time zone;

alter table product_design_sections
  add column deleted_at timestamp with time zone;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  drop column deleted_at;

alter table product_design_images
  drop column deleted_at;

alter table product_design_sections
  drop column deleted_at;
  `);
};
