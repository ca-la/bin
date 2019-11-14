import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
drop index productvideos_product_id;
drop table productvideos;

drop index collectionphotos_collection_id;
drop table collectionphotos;

drop index designer_photo_position;
drop table designerphotos;

drop index designer_position;
drop table designers;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
create table productvideos (
  id uuid primary key,
  product_id text not null,
  video_url text not null,
  poster_image_url text not null
);

create index productvideos_product_id on productvideos using btree (product_id);

create table collectionphotos (
  id uuid primary key,
  collection_id text not null,
  photo_url text not null
);

create index collectionphotos_collection_id on collectionphotos (collection_id);

create table designers (
  id uuid primary key,
  name text not null,
  bio_html text,
  twitter_handle text,
  instagram_handle text,
  position smallint not null,
  created_at timestamp with time zone default now()
);

create unique index designer_position on designers using btree (position);

create table designerphotos (
  id uuid primary key,
  designer_id uuid not null references designers(id),
  photo_url text not null,
  position smallint not null,
  created_at timestamp with time zone default now()
);

create unique index designer_photo_position on designerphotos using btree (designer_id, position);
  `);
}
