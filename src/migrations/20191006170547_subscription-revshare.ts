import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table subscriptions
  add column revenue_share_percentage smallint not null default 0,
  add constraint revshare_value check
    (revenue_share_percentage >= 0 and revenue_share_percentage <= 100);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table subscriptions
  drop column revenue_share_percentage;
  `);
}
