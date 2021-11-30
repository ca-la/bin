import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX one_line_item_per_design;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE UNIQUE INDEX one_line_item_per_design ON line_items (design_id)
 WHERE created_at > '2020-08-25 00:00:00-04'::timestamp with time zone;
  `);
}
