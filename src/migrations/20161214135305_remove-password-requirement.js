"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table users
  alter column password_hash drop not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table users
  alter column password_hash set not null;
  `);
};
