"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  add column due_date date,
  add column expected_cost_cents integer;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  drop column due_date,
  drop column expected_cost_cents;
  `);
};
