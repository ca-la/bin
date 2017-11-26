'use strict';

exports.up = function up(knex) {
  return knex.raw(`
update product_design_statuses
  set sla_description = ''
  where id = 'IN_REVIEW';
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
update product_design_statuses
  set sla_description = '48 hours'
  where id = 'IN_REVIEW';
  `);
};
