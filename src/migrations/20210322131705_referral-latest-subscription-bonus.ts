import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table referral_redemptions
  add column latest_subscription_bonus_issued_at timestamp with time zone;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table referral_redemptions
  drop column latest_subscription_bonus_issued_at;
  `);
}
