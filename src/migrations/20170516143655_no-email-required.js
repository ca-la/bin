"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table users
  alter column email drop not null;

alter table users
  add constraint email_or_phone check (
    email is not null or phone is not null
  );
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table users
  alter column email set not null;

alter table users
  drop constraint email_or_phone;
  `);
};
