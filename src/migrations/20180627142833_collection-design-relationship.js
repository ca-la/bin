"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table collection_designs (
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "collection_id" uuid references collections(id),
  "design_id" uuid references product_designs(id),
  primary key ("collection_id", "design_id")
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table collection_designs;
  `);
};
