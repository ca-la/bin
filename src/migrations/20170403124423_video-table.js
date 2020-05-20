"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table productvideos (
  id uuid primary key,
  product_id text not null,
  video_url text not null
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table productvideos;
  `);
};
