import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE product_design_canvases RENAME TO canvases;
CREATE VIEW product_design_canvases AS SELECT * FROM canvases;

ALTER TABLE canvases
ADD COLUMN archived_at timestamp with time zone;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE canvases
DROP COLUMN archived_at;

DROP VIEW product_design_canvases;
ALTER TABLE canvases RENAME TO product_design_canvases;
  `);
}
