'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table addresses
  add column deleted_at timestamp with time zone;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table addresses
  drop column deleted_at;
  `);
};
