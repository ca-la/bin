'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table invoice_breakdowns
  add column invoice_amount_cents integer;

update invoice_breakdowns
  set invoice_amount_cents = total_revenue_cents;

alter table invoice_breakdowns
  alter column invoice_amount_cents
    set not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table invoice_breakdowns
  drop column invoice_amount_cents;
  `);
};
