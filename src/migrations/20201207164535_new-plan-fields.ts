import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  -- This will be made non-nullable after the API supports setting it
  add column base_cost_per_billing_interval_cents bigint,
  add column per_seat_cost_per_billing_interval_cents bigint not null default 0,
  add column can_check_out boolean not null default true,
  add column can_submit boolean not null default true,

  -- null indicates no maximum (the default)
  add column maximum_seats_per_team bigint;

update plans set base_cost_per_billing_interval_cents = (
  case when billing_interval = 'MONTHLY' then
    monthly_cost_cents
  else
    monthly_cost_cents * 12
  end
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  drop column base_cost_per_billing_interval_cents,
  drop column per_seat_cost_per_billing_interval_cents,
  drop column can_check_out,
  drop column can_submit,
  drop column maximum_seats_per_team;
  `);
}
