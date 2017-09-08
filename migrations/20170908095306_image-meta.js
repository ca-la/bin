'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_images
  add column title text,
  add column description text;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_images
  drop column title,
  drop column description;
  `);
};
