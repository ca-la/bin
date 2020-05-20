"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table designers (
  id uuid primary key,
  name text not null,
  bio_html text,
  twitter_handle text,
  instagram_handle text,
  position smallint not null,
  created_at timestamp with time zone default now()
);

create table designerphotos (
  id uuid primary key,
  designer_id uuid not null references designers(id),
  photo_url text not null,
  position smallint not null,
  created_at timestamp with time zone default now()
);

create unique index designer_position on designers (position);
create unique index designer_photo_position on designerphotos (designer_id, position);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop index designer_position;
drop index designer_photo_position;

drop table designerphotos;
drop table designers;
  `);
};
