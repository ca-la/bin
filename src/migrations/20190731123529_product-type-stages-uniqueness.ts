import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE product_type_stages
  ADD CONSTRAINT unique_type_and_stage UNIQUE (
    pricing_product_type_id,
    stage_template_id
  );
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE product_type_stages DROP CONSTRAINT unique_type_and_stage;
  `);
}
