"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table users
  alter column role type text,
  alter column role set default 'USER';

alter table sessions
  alter column role type text,
  alter column role set default 'USER';

drop type user_role;

create table user_roles (
  id text primary key
);

insert into user_roles (id) values
  ('USER'),
  ('ADMIN'),
  ('PARTNER');

update users set role = 'USER' where role = 'DESIGNER';
update sessions set role = 'USER' where role = 'DESIGNER';

alter table users
  add foreign key (role) references user_roles(id),
  alter column role
    set default 'USER';

alter table sessions
  add foreign key (role) references user_roles(id),
  alter column role
    set default 'USER';
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table users
  drop constraint users_role_fkey,
  alter column role type text,
  alter column role set default 'USER';

alter table sessions
  drop constraint sessions_role_fkey,
  alter column role type text,
  alter column role set default 'USER';

create type user_role as enum ('USER', 'ADMIN', 'DESIGNER', 'PARTNER');

alter table users
  alter column role set default 'USER'::user_role;
alter table users
  alter column role type user_role using role::user_role;

alter table sessions
  alter column role set default 'USER'::user_role;
alter table sessions
  alter column role type user_role using role::user_role;

drop table user_roles;
  `);
};
