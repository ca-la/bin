import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
INSERT INTO template_categories (id, title, ordering) VALUES
  ('b8bc9043-c457-4731-af9a-e1123af3e41f', 'CALA Blanks', 0),
  ('75d3de1c-18e8-40c0-9be6-b2cf7f786a90', 'CALA Templates', 1),
  ('4dc94a52-8982-420e-b41f-344229a16f02', 'Packaging', 2);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DELETE FROM template_categories
 WHERE id IN (
  'b8bc9043-c457-4731-af9a-e1123af3e41f',
  '75d3de1c-18e8-40c0-9be6-b2cf7f786a90',
  '4dc94a52-8982-420e-b41f-344229a16f02'
);
  `);
}
