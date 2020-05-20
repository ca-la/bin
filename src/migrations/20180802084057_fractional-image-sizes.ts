import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table product_design_images
  alter column original_height_px
    type real,
  alter column original_width_px
    type real;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table product_design_images
  alter column original_height_px
    type integer,
  alter column original_width_px
    type integer;
  `);
}
