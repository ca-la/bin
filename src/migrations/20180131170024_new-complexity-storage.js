"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_services
  add column complexity_level integer;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_services
  drop column complexity_level;
  `);
};
