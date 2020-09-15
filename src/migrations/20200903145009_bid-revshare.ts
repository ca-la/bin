import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table pricing_bids
  add column revenue_share_basis_points smallint not null default 0,
  add constraint revshare_value check
    (revenue_share_basis_points >= 0 and revenue_share_basis_points <= 10000);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table pricing_bids
  drop column revenue_share_basis_points;
  `);
}
