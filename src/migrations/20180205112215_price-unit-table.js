"use strict";

exports.up = function up(knex) {
  // Continuing the trend of introducing enums then remembering all their
  // limitations... let's just not do that again, k?
  return knex.raw(`
alter table production_prices
  alter column price_unit type text;

drop type production_price_unit;

create table production_price_units (
  id text primary key
);

insert into production_price_units (id) values
  ('GARMENT'),
  ('METER'),
  ('GRAM'),
  ('DESIGN');

alter table production_prices
  add foreign key (price_unit) references production_price_units(id);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table production_prices
  drop constraint production_prices_price_unit_fkey,
  alter column price_unit type text;

create type production_price_unit as enum ('GARMENT', 'METER', 'GRAM');

alter table production_prices
  alter column price_unit type production_price_unit using price_unit::production_price_unit;

drop table production_price_units;
  `);
};
