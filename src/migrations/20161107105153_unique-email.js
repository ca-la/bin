"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create unique index users_unique_email on users (email);
  `);
};

exports.down = function up(knex) {
  return knex.raw(`
drop index users_unique_email;
  `);
};
