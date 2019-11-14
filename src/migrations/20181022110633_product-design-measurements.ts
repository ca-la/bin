import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table product_design_canvas_measurements (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  canvas_id uuid references product_design_canvases(id) not null,
  created_by uuid references users(id) not null,
  measurement text not null,
  label text,
  starting_x integer not null,
  starting_y integer not null,
  ending_x integer not null,
  ending_y integer not null
);

create index canvas_measurements_canvas_id_index on product_design_canvas_measurements (canvas_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop index canvas_measurements_canvas_id_index;
drop table product_design_canvas_measurements;
  `);
}
