'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table pushtokens (
  id uuid primary key,
  user_id uuid references users(id),
  anonymous_id text not null,
  apns_device_token text
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table pushtokens;
  `);
};
