'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  add column svg_data text,
  alter column image_id
    drop not null,
  add constraint svg_or_image check (
    svg_data is not null or image_id is not null
  );
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  drop constraint svg_or_image,
  drop column svg_data,
  alter column image_id
    set not null;
  `);
};
