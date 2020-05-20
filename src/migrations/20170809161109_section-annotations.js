"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_section_annotations (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  section_id uuid not null references product_design_sections(id),
  x integer not null,
  y integer not null,
  text text
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table product_design_section_annotations;
  `);
};
