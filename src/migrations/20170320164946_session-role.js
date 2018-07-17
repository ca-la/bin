'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table sessions
  add column role user_role default 'USER';

update sessions set role = 'USER';

alter table sessions
  alter column role set not null;
  `);
};

exports.down = function up(knex) {
  return knex.raw(`
alter table sessions
  drop column role;
  `);
};
