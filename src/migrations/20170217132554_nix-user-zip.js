"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table users
  drop column zip;
  `);
};

exports.down = function down(knex) {
  // There's not really any coming back from this one, since we're losing data..
  return knex.raw(`
alter table users
  add column zip text not null default('00000');
  `);
};
