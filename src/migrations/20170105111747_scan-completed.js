"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table scans
  add column is_complete boolean default false;

update scans set is_complete = true;

alter table scans
  alter column is_complete set not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table scans
  drop column is_complete;
  `);
};
