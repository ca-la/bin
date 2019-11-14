import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    alter table product_design_canvas_measurements
    alter column starting_x TYPE numeric,
    alter column starting_y TYPE numeric,
    alter column ending_x TYPE numeric,
    alter column ending_y TYPE numeric,
    alter column label set not null,
    add column name text;

    alter table product_design_canvas_annotations
    alter column x TYPE numeric,
    alter column y TYPE numeric;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    alter table product_design_canvas_measurements
    alter column starting_x TYPE integer,
    alter column starting_y TYPE integer,
    alter column ending_x TYPE integer,
    alter column ending_y TYPE integer,
    alter column label drop not null,
    drop column name;

    alter table product_design_canvas_annotations
    alter column x TYPE integer,
    alter column y TYPE integer;
  `);
}
