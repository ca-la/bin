'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_sections
  add column template_name text;

alter table product_design_sections
  add constraint template_or_custom check (
    (template_name is null) != (custom_image_id is null)
  );
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_sections
  drop column template_name;
  `);
};
