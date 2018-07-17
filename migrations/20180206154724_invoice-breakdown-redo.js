'use strict';

exports.up = function up(knex) {
  return knex.raw(`
drop table invoice_breakdowns;

create table invoice_breakdowns (
  id uuid primary key,
  invoice_id uuid references invoices(id),

  invoice_amount_cents integer not null,
  invoice_margin_cents integer not null,
  stripe_fee_cents integer not null,
  cost_of_services_cents integer not null,
  total_profit_cents integer not null,
  pricing_table_data jsonb
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table invoice_breakdowns;

create table invoice_breakdowns (
  id uuid primary key,
  invoice_id uuid references invoices(id),
  total_revenue_cents integer not null,
  total_cost_cents integer not null,
  total_profit_cents integer not null,
  stripe_fee_cents integer not null,
  invoice_amount_cents integer not null
);
  `);
};
