'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table users
  add column password_hash text not null;
  `);
};

exports.down = function up(knex) {
  return knex.raw(`
alter table users
  drop column password_hash;
  `);
};
