'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_statuses (
  id text primary key,
  sla_description text not null
);

insert into product_design_statuses
  (id, sla_description)
  values
  ('DRAFT', ''),
  ('IN_REVIEW', '48 hours'),
  ('NEEDS_DEVELOPMENT_PAYMENT', ''),
  ('DEVELOPMENT', '2 weeks'),
  ('SAMPLE_PRODUCTION', '2 weeks'),
  ('SAMPLE_REVIEW', ''),
  ('NEEDS_PRODUCTION_PAYMENT', ''),
  ('PRE_PRODUCTION', '2 weeks'),
  ('PRODUCTION', '4 weeks'),
  ('NEEDS_FULFILLMENT_PAYMENT', ''),
  ('FULFILLMENT', '3 days'),
  ('COMPLETE', '');

alter table product_designs
  add foreign key (status) references product_design_statuses(id);

alter table product_design_status_updates
  add foreign key (new_status) references product_design_statuses(id);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_designs
  drop constraint product_designs_status_fkey;

alter table product_design_status_updates
  drop constraint product_design_status_updates_new_status_fkey;

drop table product_design_statuses;
  `);
};
