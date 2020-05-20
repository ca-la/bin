"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table users (
  id uuid primary key,
  name text not null,
  email text not null,
  zip text not null,
  created_at timestamp with time zone not null default now()
);

create table sessions (
  id uuid primary key,
  user_id uuid not null references users(id),
  created_at timestamp with time zone not null default now()
);
  `);
};

exports.down = function up(knex) {
  return knex.raw(`
drop table users cascade;
drop table sessions cascade;
  `);
};
