"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table scanphotos
  add column calibration_data jsonb default '{}',
  add column control_points jsonb default '{}';
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table scanphotos
  drop column calibration_data,
  drop column control_points;
  `);
};
