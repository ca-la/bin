'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create type production_price_unit as enum ('GARMENT', 'METER', 'GRAM');

alter table production_prices
  add column setup_cost_cents integer,
  add column price_unit production_price_unit;

update production_prices
  set setup_cost_cents = 0,
  price_unit = 'GARMENT';

alter table production_prices
  alter column setup_cost_cents
    set not null,
  alter column price_unit
    set not null;

insert into product_design_service_ids (id) values
  ('SCREEN_PRINT'),
  ('EMBROIDERY'),
  ('WASH'),
  ('DYE'),
  ('DTG_ROLL_PRINT'),
  ('DTG_ENGINEERED_PRINT'),
  ('DIGITAL_SUBLIMATION_PRINT'),
  ('ROTARY_PRINT');
  `);
};

const serviceList = `(
  'SCREEN_PRINT',
  'EMBROIDERY',
  'WASH',
  'DYE',
  'DTG_ROLL_PRINT',
  'DTG_ENGINEERED_PRINT',
  'DIGITAL_SUBLIMATION_PRINT',
  'ROTARY_PRINT'
)`;

exports.down = function down(knex) {
  return knex.raw(`
alter table production_prices
  drop column setup_cost_cents,
  drop column price_unit;

drop type production_price_unit;

delete from product_design_services where service_id in ${serviceList};

delete from production_prices where service_id in ${serviceList};

delete from product_design_service_ids where id in ${serviceList};
  `);
};
