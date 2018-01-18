'use strict';

exports.up = function up(knex) {
  // Tentatively - a user will have multiple payment_methods records - one for
  // each card they have on file.
  return knex.raw(`
create table payment_methods (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  user_id uuid not null references users(id),
  stripe_customer_id text not null
);

create table invoices (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  user_id uuid not null references users(id),
  total_cents integer not null,
  paid_at timestamp with time zone,
  payment_method_id uuid references payment_methods(id),
  stripe_charge_id text,
  -- Optional; invoices can be for non-design-related things
  design_id uuid references product_designs(id),
  title text,
  description text
);

create table invoice_breakdowns (
  id uuid primary key,
  invoice_id uuid references invoices(id),
  total_revenue_cents integer not null,
  total_cost_cents integer not null,
  total_profit_cents integer not null
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table invoice_breakdowns;
drop table invoices;
drop table payment_methods;
  `);
};
