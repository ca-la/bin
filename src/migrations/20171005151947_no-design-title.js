'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_designs
  alter column title
    drop not null;

update product_designs
  set title = null
  where title = '';
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
update product_designs
  set title = ''
  where title is null;

alter table product_designs
  alter column title
    set not null;
  `);
};
