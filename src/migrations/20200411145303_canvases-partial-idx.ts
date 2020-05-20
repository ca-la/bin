import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE INDEX canvas_design_id_partial_idx
    ON canvases (design_id, ordering)
 WHERE deleted_at IS NULL AND archived_at IS NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX canvas_design_id_partial_idx;
  `);
}
