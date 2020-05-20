"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table invoice_payments
  alter column "payment_method_id" drop not null,
  drop constraint "stripe_or_rumbleship";
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table invoice_payments
  alter column "payment_method_id" set not null,
  add constraint
    "stripe_or_rumbleship"
      check ((stripe_charge_id is null) <> (rumbleship_purchase_hash is null));
  `);
};
