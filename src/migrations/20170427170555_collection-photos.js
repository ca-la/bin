"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table collectionphotos (
  id uuid primary key,
  collection_id text not null,
  photo_url text not null
);

create index collectionphotos_collection_id on collectionphotos (collection_id);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop index collectionphotos_collection_id;

drop table collectionphotos;
  `);
};
