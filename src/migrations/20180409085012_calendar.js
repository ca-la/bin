"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_events (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  start_at timestamp with time zone not null,
  expected_end_at timestamp with time zone not null,
  actual_end_at timestamp with time zone,
  title text not null,
  owner_user_id uuid references users(id),
  design_id uuid references product_designs(id)
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table product_design_events;
  `);
};
