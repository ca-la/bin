'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table production_prices (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  vendor_user_id uuid not null references users(id),
  service_id text not null references product_design_service_ids(id),
  minimum_units integer not null,
  complexity_level integer not null,
  price_cents integer not null
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table production_prices;
  `);
};
