"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_section_types (
  id text primary key
);

insert into product_design_section_types
  (id)
  values
  ('FLAT_SKETCH'),
  ('IMAGE'),
  ('TEXT'),
  ('DATA_TABLE');

alter table product_design_sections
  add column type text
    references product_design_section_types(id)
    default 'FLAT_SKETCH';
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_sections
  drop column type;

drop table product_design_section_types;
  `);
};
