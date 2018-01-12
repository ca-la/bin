'use strict';

exports.up = function up(knex) {
  // This is becoming gnarly to maintain, so getting rid of it for now. If we
  // really care about data integrity we should either enforce a much more
  // complicated constraint (checking `type` against the presence/absence of
  // other data, do it in the application level (which we basically are
  // already), or split these out into different tables with more specific
  // restrictions (probably the Right Answer, but y'know).
  return knex.raw(`
alter table product_design_feature_placements
  drop constraint path_or_image;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_feature_placements
  add constraint path_or_image check (
    path_data is not null or image_id is not null
  );
  `);
};
