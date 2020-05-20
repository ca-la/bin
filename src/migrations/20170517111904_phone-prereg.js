"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table users
  add column is_sms_preregistration boolean default false;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table users
  drop column is_sms_preregistration;
  `);
};
