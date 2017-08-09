'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_section_annotations (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  section_id uuid not null references product_design_sections(id),
  text text
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table product_design_section_annotations;
  `);
};
