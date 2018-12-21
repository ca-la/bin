import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE product_design_canvases ADD ordering INTEGER DEFAULT 0;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE product_design_canvases DROP ordering;
  `);
}
