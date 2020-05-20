"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table collection_designs
  drop column deleted_at;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table collection_designs
  add column deleted_at timestamp with time zone;
  `);
};
