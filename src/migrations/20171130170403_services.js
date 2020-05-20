"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_service_ids (
  id text primary key
);

insert into product_design_service_ids
  (id)
  values
  ('DESIGN'),
  ('SOURCING'),
  ('TECHNICAL_DESIGN'),
  ('PATTERN_MAKING'),
  ('SAMPLING'),
  ('PRODUCTION');

create table product_design_services (
  id uuid primary key,
  design_id uuid not null references product_designs(id),
  vendor_user_id uuid references users(id),
  created_at timestamp with time zone not null default now(),
  service_id text references product_design_service_ids(id) not null
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table product_design_services;
drop table product_design_service_ids
  `);
};
