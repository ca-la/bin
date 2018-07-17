'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_sections
  add column panel_data jsonb;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_sections
  drop column panel_data;
  `);
};
