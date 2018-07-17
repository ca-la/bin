'use strict';

exports.up = function up(knex) {
  return knex.raw(`
insert into production_price_units (id) values ('SIZE');
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
delete from production_price_units where id = 'SIZE';
  `);
};
