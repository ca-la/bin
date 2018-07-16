'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table scans
  add column created_at timestamp with time zone not null default now();

alter table scanphotos
  add column created_at timestamp with time zone not null default now();
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table scans
  drop column created_at;

alter table scanphotos
  drop column created_at;
  `);
};
