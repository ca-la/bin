'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create index productvideos_product_id on productvideos (product_id);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop index productvideos_product_id;
  `);
};
