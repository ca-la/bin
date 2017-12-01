'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_services (
  id uuid primary key,
  design_id uuid not null references product_designs(id),
  vendor_user_id uuid references users(id)
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table product_design_services;
  `);
};
