"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  add column sample_complexity int default 0,
  add column production_complexity int default 0;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  drop column sample_complexity,
  drop column production_complexity;
  `);
};
