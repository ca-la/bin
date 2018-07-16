'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  alter column show_pricing_breakdown set default true;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  alter column show_pricing_breakdown set default false;
  `);
};
