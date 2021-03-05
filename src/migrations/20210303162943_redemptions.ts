import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table referral_redemptions (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  referring_user_id uuid references users(id) not null,
  referred_user_id uuid references users(id) not null
);

create unique index one_referrer on referral_redemptions (referred_user_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table referral_redemptions;
  `);
}
