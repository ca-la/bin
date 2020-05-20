import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE bid_task_types (
  id uuid PRIMARY KEY,
  pricing_bid_id uuid REFERENCES pricing_bids(id),
  task_type_id uuid
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE bid_task_types;
  `);
}
