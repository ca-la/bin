'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  drop constraint svg_or_image,
  drop column svg_data,
  add column path_data jsonb,
  add constraint path_or_image check (
    path_data is not null or image_id is not null
  );
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  drop constraint path_or_image,
  drop column path_data,
  add column svg_data text,
  add constraint svg_or_image check (
    svg_data is not null or image_id is not null
  );
  `);
};
