import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  add column revenue_share_basis_points smallint not null default 0,
  add column cost_of_goods_share_basis_points smallint not null default 0;

update plans set revenue_share_basis_points = revenue_share_percentage * 100;

alter table plans
  add constraint revshare_basis_value check
    (revenue_share_basis_points >= 0 and revenue_share_basis_points <= 10000),
  add constraint cogs_basis_value check
    (cost_of_goods_share_basis_points >= 0 and cost_of_goods_share_basis_points <= 10000);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  drop column revenue_share_basis_points,
  drop column cost_of_goods_share_basis_points;
  `);
}
