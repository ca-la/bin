'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table invoices
  add column rumbleship_purchase_hash text;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table invoices
  drop column rumbleship_purchase_hash;
  `);
};
