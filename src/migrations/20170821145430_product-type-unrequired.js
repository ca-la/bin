'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  alter column product_type drop not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  alter column product_type set not null;
  `);
};
