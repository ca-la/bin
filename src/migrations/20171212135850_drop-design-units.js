"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  drop column units_to_produce;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  add column units_to_produce integer;
  `);
};
