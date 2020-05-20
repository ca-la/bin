"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table collections (
  "id" uuid primary key,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "created_by" uuid references users(id),
  "title" text not null,
  "description" text not null
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table collections;
  `);
};
