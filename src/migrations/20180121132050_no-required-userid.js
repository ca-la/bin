"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table invoices
  alter column user_id
    drop not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table invoices
  alter column user_id
    set not null;
  `);
};
