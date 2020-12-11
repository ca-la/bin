import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
update plans set base_cost_per_billing_interval_cents = (
  case when billing_interval = 'MONTHLY' then
    monthly_cost_cents
  else
    monthly_cost_cents * 12
  end
);

alter table plans
  alter column base_cost_per_billing_interval_cents set not null;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  alter column base_cost_per_billing_interval_cents drop not null;
  `);
}
