'use strict';

exports.up = function up(knex) {
  return knex.raw(`
update product_design_feature_placements
  set type = 'IMAGE'
  where type is null;

alter table product_design_feature_placements
  add column process_name text,
  alter column type set not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  drop column process_name,
  alter column type drop not null;
  `);
};
