'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table users
  alter column referral_code set not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table users
  alter column referral_code drop not null;
  `);
};
