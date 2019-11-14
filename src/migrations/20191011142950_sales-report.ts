import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE monthly_sales_reports (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  created_by uuid not null references users(id),
  designer_id uuid not null references users(id),
  available_credit_cents bigint not null,
  cost_of_returned_goods_cents bigint not null,
  financing_balance_cents bigint not null,
  financing_principal_paid_cents bigint not null,
  fulfillment_cost_cents bigint not null,
  paid_to_designer_cents bigint not null,
  revenue_cents bigint not null,
  revenue_share_percentage smallint not null
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE monthly_sales_reports;
  `);
}
