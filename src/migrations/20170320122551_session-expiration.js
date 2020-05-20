"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table sessions
  add column expires_at timestamp with time zone;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table sessions
  drop column expires_at;
  `);
};
