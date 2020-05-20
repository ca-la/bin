"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_sections
  drop constraint template_or_custom;

alter table product_design_sections
  add constraint template_or_custom check (
    type != 'FLAT_SKETCH' or
    ((template_name is null) != (custom_image_id is null))
  );
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_sections
  drop constraint template_or_custom;

alter table product_design_sections
  add constraint template_or_custom check (
    (template_name is null) != (custom_image_id is null)
  );
  `);
};
