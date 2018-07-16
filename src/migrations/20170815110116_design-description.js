'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  add column description text;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  drop column description;
  `);
};
