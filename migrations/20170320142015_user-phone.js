'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table users
  add column phone text;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table users
  drop column phone;
  `);
};
