"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_variants
  add column position integer not null default 0;

create unique index product_design_variant_position
  on product_design_variants (design_id, position);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_variants
  drop column position;
  `);
};
