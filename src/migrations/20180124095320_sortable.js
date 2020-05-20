"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_sections
  add column position numeric;

update product_design_sections
  set position = cast(extract(epoch from created_at) as numeric);

alter table product_design_sections
  alter column position
    set not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_sections
  drop column position;
  `);
};
