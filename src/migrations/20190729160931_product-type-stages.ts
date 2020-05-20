import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE product_type_stages (
  id uuid primary key,
  pricing_product_type_id uuid references pricing_product_types(id) not null,
  stage_template_id uuid not null
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE product_type_stages;
  `);
}
