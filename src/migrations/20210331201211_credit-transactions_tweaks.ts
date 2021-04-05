import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table credit_transactions
  add column type text,
  alter column created_by drop not null,
  alter column credit_delta_cents type integer
;

create table referral_runs (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  latest_stripe_invoice_id text not null
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table credit_transactions
  drop column type,
  alter column created_by set not null,
  alter column credit_delta_cents type bigint
;
drop table referral_runs;
  `);
}
