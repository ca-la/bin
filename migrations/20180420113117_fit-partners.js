'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table fit_partners (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  shopify_hostname text not null,
  shopify_app_api_key text not null,
  shopify_app_password text not null,
  custom_fit_domain text,
  sms_copy text
);

create table fit_partner_customers (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  partner_id uuid references fit_partners(id) not null,
  shopify_user_id text not null
);

alter table scans
  add column fit_partner_customer_id uuid references fit_partner_customers(id);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table scans
  drop column fit_partner_customer_id;

drop table fit_partner_customers;
drop table fit_partners;
  `);
};
