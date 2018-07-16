'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_section_annotations
  add column user_id uuid not null references users(id);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_section_annotations
  drop column user_id;
  `);
};
