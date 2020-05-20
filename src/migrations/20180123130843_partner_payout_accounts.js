"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table partner_payout_accounts (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  deleted_at timestamp with time zone,
  user_id uuid not null references users(id),
  stripe_access_token text not null,
  stripe_refresh_token text not null,
  stripe_publishable_key text not null,
  stripe_user_id text not null
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table partner_payout_accounts;
  `);
};
