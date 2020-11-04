import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  drop column revenue_share_percentage;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  add column revenue_share_percentage smallint not null default 0;

alter table plans
  add constraint revshare_value check
    (revenue_share_percentage >= 0 and revenue_share_percentage <= 100);

update plans set revenue_share_percentage = revenue_share_basis_points / 100;
  `);
}
