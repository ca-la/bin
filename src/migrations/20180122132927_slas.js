'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_status_slas (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  design_id uuid not null references product_designs(id),
  status_id text not null references product_design_statuses(id),
  estimated_completion_date date not null
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table product_design_status_slas;
  `);
};
