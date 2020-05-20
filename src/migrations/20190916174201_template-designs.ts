import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE template_designs (
  design_id uuid references product_designs(id)
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE template_designs;
  `);
}
