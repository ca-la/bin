'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table product_designs (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  title text not null,
  product_type text not null,
  product_options jsonb,
  user_id uuid not null references users(id)
);

create table product_design_images (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  design_id uuid not null references product_designs(id)
);

create table product_design_sections (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  design_id uuid not null references product_designs(id),
  custom_image_id uuid references product_design_images(id)
);

create table product_design_image_placements (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  section_id uuid not null references product_design_sections(id),
  image_id uuid not null references product_design_images(id),
  z_index integer not null,
  x integer not null,
  y integer not null,
  scale real not null,
  rotation real not null
);

create unique index product_design_image_placement_index
  on product_design_image_placements (section_id, z_index);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop index product_design_image_placement_index;

drop table product_design_image_placements;
drop table product_design_sections;
drop table product_design_images;
drop table product_designs;
  `);
};
