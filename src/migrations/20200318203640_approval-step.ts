import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE design_approval_steps (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  ordering integer NOT NULL,
  design_id UUID REFERENCES product_designs(id)
);

CREATE INDEX design_approval_steps_design_order
  ON design_approval_steps (design_id, ordering);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX design_approval_steps_design_order;
DROP TABLE design_approval_steps;
  `);
}
