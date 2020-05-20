import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table notifications
add column annotation_id uuid references product_design_canvas_annotations(id),
add column canvas_id uuid references product_design_canvases(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table notifications
drop column annotation_id,
drop column canvas_id;
  `);
}
