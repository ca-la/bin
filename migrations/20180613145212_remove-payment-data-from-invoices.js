'use strict';

exports.up = function up(knex) {
  return knex.raw(`
drop view invoice_with_payments;

alter table invoices
  drop constraint "user_or_design",
  drop column "paid_at",
  drop column "payment_method_id",
  drop column "stripe_charge_id",
  drop column "rumbleship_purchase_hash";

create view invoice_with_payments as
select
  i.id,
  i.created_at,
  i.deleted_at,
  i.user_id,
  i.total_cents,
  i.title,
  i.description,
  i.design_id,
  i.design_status_id,
  coalesce(sum(p.total_cents), 0) as total_paid,
  coalesce(sum(p.total_cents), 0) = i.total_cents as is_paid,
  max(p.created_at) as paid_at
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

alter table invoices
  add constraint "user_or_design" check ((user_id is null) <> (design_id is null)),
  add column "paid_at" timestamp with time zone,
  add column "payment_method_id" uuid references payment_methods(id),
  add column "stripe_charge_id" text,
  add column "rumbleship_purchase_hash" text;

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
