'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create unique index users_unique_phone on users (phone);
  `);
};

exports.down = function up(knex) {
  return knex.raw(`
drop index users_unique_phone;
  `);
};
