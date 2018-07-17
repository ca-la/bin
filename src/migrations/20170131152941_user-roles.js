'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create type user_role as enum ('USER', 'ADMIN');

alter table users
  add column role user_role default 'USER';

update users set role = 'USER';

alter table users
  alter column role set not null;
  `);
};

exports.down = function up(knex) {
  return knex.raw(`
alter table users
  drop column role;

drop type user_role;
  `);
};
