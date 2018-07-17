'use strict';

exports.up = function up(knex) {
  // In the future we'll be able to make this `not null` but there's
  // unfortunately no easy migration path to this right now since we don't
  // have a structured representation of which section a panel is in. Will have
  // to write a script migration to figure it all out.
  return knex.raw(`
alter table product_design_selected_options
  add column section_id uuid references product_design_sections(id);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_selected_options
  drop column section_id;
  `);
};
