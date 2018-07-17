'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  add column text_content text,
  add column text_font text,
  add column text_color text;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  drop column text_content,
  drop column text_font,
  drop column text_color;
  `);
};
