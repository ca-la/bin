'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table scans
  add column deleted_at timestamp with time zone;

alter table scanphotos
  add column deleted_at timestamp with time zone;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table scans
  drop column deleted_at;

alter table scanphotos
  drop column deleted_at;
  `);
};
