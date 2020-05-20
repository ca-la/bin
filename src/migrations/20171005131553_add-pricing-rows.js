"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  add column computed_pricing_table jsonb,
  add column override_pricing_table jsonb;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  drop column computed_pricing_table,
  drop column override_pricing_table;
  `);
};
