'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_section_annotations
  add column in_reply_to_id uuid references product_design_section_annotations(id),
  add column deleted_at timestamp with time zone;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_section_annotations
  drop column in_reply_to_id,
  drop column deleted_at;
  `);
};
