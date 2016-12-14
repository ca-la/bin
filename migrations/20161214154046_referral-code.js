'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table unassigned_referral_codes (
  code text primary key
);

alter table users
  add column referral_code text;
  `);
};

exports.down = function up(knex) {
  return knex.raw(`
drop table unassigned_referral_codes;

alter table users
  drop column referral_code;
  `);
};
