'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table designers (
  id uuid primary key,
  name text not null,
  bio_html text,
  twitter_handle text,
  instagram_handle text
);

create table designerphotos (
  id uuid primary key,
  is_featured boolean default false,
  designer_id uuid not null references designers(id),
  photo_url text not null
);

create unique index designerphotos_one_featured on designerphotos (designer_id, is_featured);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop index designerphotos_one_featured;
drop table designerphotos;
drop table designers;
  `);
};
