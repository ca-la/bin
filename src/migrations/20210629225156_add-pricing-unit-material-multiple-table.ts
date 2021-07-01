import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE pricing_unit_material_multiples (
  id uuid PRIMARY KEY,
  created_at timestamp with time zone not null default now(),
  version integer NOT NULL,
  minimum_units integer NOT NULL,
  multiple decimal NOT NULL
);
`);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE pricing_unit_material_multiples;
  `);
}
