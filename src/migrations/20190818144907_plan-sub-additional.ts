import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  add column billing_interval text not null;

alter table subscriptions
  add column cancelled_at timestamp with time zone;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  drop column billing_interval;

alter table subscriptions
  drop column cancelled_at;
  `);
}
