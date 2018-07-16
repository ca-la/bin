'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  add column sourcing_complexity int default 0,
  add column pattern_complexity int default 0;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  drop column sourcing_complexity,
  drop column pattern_complexity;
  `);
};
