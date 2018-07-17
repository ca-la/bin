'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table invoice_payments
  (
    "id" uuid primary key,
    "created_at" timestamp with time zone default now() not null,
    "deleted_at" timestamp with time zone,
    "invoice_id" uuid not null references invoices(id),
    "total_cents" integer not null,
    "payment_method_id" uuid not null references payment_methods(id),
    "stripe_charge_id" text unique,
    "rumbleship_purchase_hash" text unique

    constraint
      "stripe_or_rumbleship"
        check ((stripe_charge_id is null) <> (rumbleship_purchase_hash is null))
  );

create view invoice_with_payments as
select
  i.*,
  sum(coalesce(p.total_cents, 0)) as total_paid,
  sum(coalesce(p.total_cents, 0)) = i.total_cents as is_paid,
  max(p.created_at) as last_paid_at
from invoices as i
  left outer join
    (select * from invoice_payments where deleted_at is null) as p
    on i.id = p.invoice_id
group by i.id;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop view invoice_with_payments;
drop table invoice_payments;
  `);
};
