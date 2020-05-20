"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table addresses
  add column created_at timestamp with time zone not null default now();
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table addresses
  drop column created_at;
  `);
};
