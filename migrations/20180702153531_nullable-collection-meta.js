'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table collections
  alter column title drop not null,
  alter column description drop not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table collections
  alter column title set not null,
  alter column description set not null;
  `);
};
