'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_statuses
  add column action_name text;

update product_design_statuses set
  action_name = c.action_name
from (values
  ('DRAFT', 'Submit'),
  ('IN_REVIEW', 'Approve'),
  ('NEEDS_DEVELOPMENT_PAYMENT', 'Pay'),
  ('DEVELOPMENT', 'Mark Complete'),
  ('SAMPLE_PRODUCTION', 'Mark Complete'),
  ('SAMPLE_REVIEW', 'Approve'),
  ('NEEDS_PRODUCTION_PAYMENT', 'Pay'),
  ('PRE_PRODUCTION', 'Mark Complete'),
  ('PRODUCTION', 'Mark Complete'),
  ('NEEDS_FULFILLMENT_PAYMENT', 'Pay'),
  ('FULFILLMENT', 'Mark Complete'),
  ('COMPLETE', '')
) as c(id, action_name)
where c.id = product_design_statuses.id;

alter table product_design_statuses
  alter column action_name
    set not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_statuses
  drop column action_name;
  `);
};
