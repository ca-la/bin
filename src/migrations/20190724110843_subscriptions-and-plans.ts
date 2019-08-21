import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table users
  drop column subscription_waived_at;

create table plans (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  monthly_cost_cents bigint not null,
  stripe_plan_id text not null,
  title text not null,
  is_default boolean not null default false
);

create unique index one_default_plan on plans (is_default)
  where is_default is true;

create table subscriptions (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  plan_id uuid not null references plans(id),
  payment_method_id uuid references payment_methods(id),
  stripe_subscription_id text,
  user_id uuid not null references users(id),
  is_payment_waived boolean not null default false
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table users
  add column subscription_waived_at timestamp with time zone;
drop table subscriptions;
drop index one_default_plan;
drop table plans;
  `);
}
