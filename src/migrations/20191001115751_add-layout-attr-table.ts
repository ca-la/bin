import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE dimension_attributes RENAME TO layout_attributes;

CREATE VIEW dimension_attributes AS
  SELECT * FROM layout_attributes;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW dimension_attributes;

ALTER TABLE layout_attributes RENAME TO dimension_attributes;
  `);
}
