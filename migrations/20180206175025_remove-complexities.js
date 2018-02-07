'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  drop column sourcing_complexity,
  drop column pattern_complexity,
  drop column production_complexity,
  drop column sample_complexity;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  add column sourcing_complexity integer default 0,
  add column pattern_complexity integer default 0,
  add column production_complexity integer default 0,
  add column sample_complexity integer default 0;
  `);
};
