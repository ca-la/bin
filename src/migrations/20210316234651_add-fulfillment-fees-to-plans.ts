import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  add column fulfillment_fees_share_basis_points smallint not null default 0;

alter table plans
  add constraint fulfillment_fees_basis_value check
    (fulfillment_fees_share_basis_points >= 0 and fulfillment_fees_share_basis_points <= 10000);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  drop column fulfillment_fees_share_basis_points;
  `);
}
