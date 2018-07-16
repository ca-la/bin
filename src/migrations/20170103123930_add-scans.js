'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create type scan_type AS ENUM ('PHOTO', 'HUMANSOLUTIONS');

create table scans (
  id uuid primary key,
  user_id uuid not null references users(id),
  type scan_type not null,
  measurements jsonb
);

create table scanphotos (
  id uuid primary key,
  scan_id uuid not null references scans(id)
);
  `);
};

exports.down = function up(knex) {
  return knex.raw(`
drop table scanphotos;
drop table scans;
drop type scan_type;
  `);
};
