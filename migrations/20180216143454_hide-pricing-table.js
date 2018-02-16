'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  add column show_pricing_breakdown boolean default false;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  drop column show_pricing_breakdown;
  `);
};
