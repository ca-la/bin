'use strict';

exports.up = function up(knex) {
  return knex.raw(`
update production_prices
  set price_unit = 'GARMENT'
  where service_id = 'WASH' or service_id = 'DYE'
  and price_unit = 'METER';
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
update production_prices
  set price_unit = 'METER'
  where service_id = 'WASH' or service_id = 'DYE'
  and price_unit = 'GARMENT';
  `);
};
