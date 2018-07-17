'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  drop column setup_cost_cents;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  add column setup_cost_cents integer;
  `);
};
