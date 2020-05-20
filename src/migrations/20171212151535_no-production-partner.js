"use strict";

exports.up = function up(knex) {
  return knex.raw(`
update product_design_collaborators
  set role = 'EDIT'
  where role = 'PRODUCTION_PARTNER';
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
  `);
};
