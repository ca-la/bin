'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_options (
  id uuid primary key,
  user_id uuid references users(id),
  is_builtin_option boolean default false,
  unit_cost_cents integer,
  preferred_cost_unit text,
  weight_gsm real,
  preferred_weight_unit text,
  created_at timestamp with time zone default now(),
  deleted_at timestamp with time zone,
  title text,
  sku text,
  preview_image_id uuid references product_design_images(id),
  pattern_image_id uuid references product_design_images(id),
  vendor_name text
);

create table product_design_selected_options (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  deleted_at timestamp with time zone,
  design_id uuid not null references product_designs(id),
  option_id uuid not null references product_design_options(id),
  units_required_per_garment real not null
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table product_design_selected_options;
drop table product_design_options;
  `);
};
