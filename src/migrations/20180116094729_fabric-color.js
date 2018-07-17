'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_options
  add column hex_color_code text;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_options
  drop column hex_color_code;
  `);
};
