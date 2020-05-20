"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_selected_options
  alter column section_id
    set not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_selected_options
  alter column section_id
    drop not null;
  `);
};
