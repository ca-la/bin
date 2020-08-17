import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`

CREATE TABLE template_categories (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  ordering INTEGER
);

ALTER TABLE template_designs
 DROP CONSTRAINT unique_design,
  ADD COLUMN template_category_id UUID REFERENCES template_categories(id),
  ADD CONSTRAINT unique_design_category UNIQUE (design_id, template_category_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE template_designs
 DROP CONSTRAINT unique_design_category,
 DROP COLUMN template_category_id,
  ADD CONSTRAINT unique_design UNIQUE (design_id);

DROP TABLE template_categories;
  `);
}
