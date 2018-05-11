'use strict';

exports.up = function up(knex) {
  return knex.raw(`
insert into user_roles (id) values ('FIT_PARTNER');
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
delete from user_roles where id='FIT_PARTNER';
  `);
};
