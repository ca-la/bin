import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE product_design_images RENAME TO images;
CREATE VIEW product_design_images AS SELECT * FROM images;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW product_design_images;
ALTER TABLE images RENAME TO product_design_images;
  `);
}
