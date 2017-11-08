'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_statuses
  add column label text;

update product_design_statuses set
  label = c.label
from (values
  ('DRAFT', 'Draft'),
  ('IN_REVIEW', 'In Review'),
  ('NEEDS_DEVELOPMENT_PAYMENT', 'Needs Development Payment'),
  ('DEVELOPMENT', 'Development'),
  ('SAMPLE_PRODUCTION', 'Sample Production'),
  ('SAMPLE_REVIEW', 'Sample Review'),
  ('NEEDS_PRODUCTION_PAYMENT', 'Needs Production Payment'),
  ('PRE_PRODUCTION', 'Pre Production'),
  ('PRODUCTION', 'Production'),
  ('NEEDS_FULFILLMENT_PAYMENT', 'Needs Fulfillment Payment'),
  ('FULFILLMENT', 'Fulfillment'),
  ('COMPLETE', 'Complete')
) as c(id, label) 
where c.id = product_design_statuses.id;

alter table product_design_statuses
  alter column label
    set not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_statuses
  drop column label;
  `);
};
