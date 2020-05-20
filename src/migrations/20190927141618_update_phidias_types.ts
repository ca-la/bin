import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE nodes
  ADD COLUMN type text;

ALTER TABLE sketch_attributes RENAME TO image_attributes;

CREATE VIEW sketch_attributes AS
  SELECT * FROM image_attributes;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE nodes
  DROP COLUMN type;

DROP VIEW sketch_attributes;

ALTER TABLE image_attributes RENAME TO sketch_attributes;
  `);
}
