import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE template_designs
  ADD CONSTRAINT unique_design UNIQUE (design_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE template_designs
  DROP CONSTRAINT unique_design;
  `);
}
