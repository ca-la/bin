'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table production_prices
  add column setup_cost_cents integer;

update production_prices
  set setup_cost_cents = 0;

alter table production_prices
  alter column setup_cost_cents
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

exports.down = function down(knex) {
  return knex.raw(`
alter table production_prices
  drop column setup_cost_cents;

delete from product_design_service_ids where id in (
  'SCREEN_PRINT',
  'EMBROIDERY',
  'WASH',
  'DYE',
  'DTG_ROLL_PRINT',
  'DTG_ENGINEERED_PRINT',
  'DIGITAL_SUBLIMATION_PRINT',
  'ROTARY_PRINT'
);
  `);
};
