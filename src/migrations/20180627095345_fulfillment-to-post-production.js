"use strict";

exports.up = function up(knex) {
  return knex.raw(`
update product_design_statuses
  set "label" = 'Needs Post Production Payment'
where "id" = 'NEEDS_FULFILLMENT_PAYMENT';
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
update product_design_statuses
  set "label" = 'Needs Fulfillment Payment'
where "id" = 'NEEDS_FULFILLMENT_PAYMENT';
  `);
};
