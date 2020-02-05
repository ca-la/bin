import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE non_bid_design_costs
  ADD COLUMN cents integer NOT NULL;
`);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE non_bid_design_costs
  DROP COLUMN cents;
`);
}
