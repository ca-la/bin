"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  drop column preview_image_data;

alter table product_designs
  add column preview_image_urls jsonb;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  drop column preview_image_urls;

alter table product_designs
  add column preview_image_data text;
  `);
};
