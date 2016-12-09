'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table addresses (
  id uuid primary key,
  user_id uuid not null references users(id),
  company_name text,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  region text not null,
  post_code text not null,
  country text not null
);
  `);
};

exports.down = function up(knex) {
  return knex.raw(`
drop table addresses;
  `);
};
