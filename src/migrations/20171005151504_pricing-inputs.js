"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  add column retail_price_cents integer,
  add column units_to_produce integer;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  drop column retail_price_cents,
  drop column units_to_produce;
  `);
};
