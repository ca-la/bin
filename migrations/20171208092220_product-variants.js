'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_variants (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  design_id uuid references product_designs(id) not null,
  color_name text,
  size_name text,
  units_to_produce integer not null default 0
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table product_design_variants;
  `);
};
