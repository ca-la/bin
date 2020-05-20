import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table notifications
add column measurement_id uuid references product_design_canvas_measurements(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table notifications
drop column measurement_id;
  `);
}
