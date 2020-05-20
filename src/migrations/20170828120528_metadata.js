"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  rename column product_options to metadata;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  rename column metadata to product_options;
  `);
};
