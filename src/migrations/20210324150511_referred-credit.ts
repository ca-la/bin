import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table referral_redemptions
  add column referred_user_signup_credit_id uuid references credit_transactions(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table referral_redemptions
  drop column referred_user_signup_credit_id;
  `);
}
