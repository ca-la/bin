"use strict";

exports.up = function up(knex) {
  return knex.raw(`
insert into product_design_service_ids (id) values ('GRADING');
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
delete from product_design_service_ids where id = 'GRADING';
  `);
};
