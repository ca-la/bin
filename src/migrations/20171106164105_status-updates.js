"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_status_updates (
  id uuid primary key,
  design_id uuid references product_designs(id),
  user_id uuid references users(id),
  created_at timestamp with time zone not null default now(),
  new_status text not null
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table product_design_status_updates;
  `);
};
