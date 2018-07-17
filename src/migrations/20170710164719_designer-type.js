'use strict';

// This is far too complicated for its own good.
//
// If we ever need to add another value to this enum, let's just make it a
// varchar or something instead. Not worth the energy.
exports.up = function up(knex) {
  return knex.raw(`
alter table users
  alter column role type text,
  alter column role set default 'USER';

alter table sessions
  alter column role type text,
  alter column role set default 'USER';

drop type user_role;

create type user_role as enum ('USER', 'ADMIN', 'DESIGNER');

alter table users
  alter column role set default 'USER'::user_role;
alter table users
  alter column role type user_role using role::user_role;

alter table sessions
  alter column role set default 'USER'::user_role;
alter table sessions
  alter column role type user_role using role::user_role;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table users
  alter column role type text,
  alter column role set default 'USER';
alter table sessions
  alter column role type text,
  alter column role set default 'USER';

drop type user_role;

create type user_role as enum ('USER', 'ADMIN');

alter table users
  alter column role set default 'USER'::user_role;
alter table users
  alter column role type user_role using role::user_role;

alter table sessions
  alter column role set default 'USER'::user_role;
alter table sessions
  alter column role type user_role using role::user_role;
  `);
};
