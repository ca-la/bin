'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table partner_payout_logs (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  invoice_id uuid not null references invoices(id),
  payout_account_id uuid not null references partner_payout_accounts(id),
  payout_amount_cents integer not null,
  message text not null,
  initiator_user_id uuid not null references users(id)
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table partner_payout_logs;
  `);
};
