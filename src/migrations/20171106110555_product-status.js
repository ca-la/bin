"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  add column status text not null default 'DRAFT';
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  drop column status;
  `);
};
