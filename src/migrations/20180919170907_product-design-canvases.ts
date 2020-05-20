import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table product_design_canvases (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  created_by uuid references users(id),
  deleted_at timestamp with time zone default null,
  design_id uuid references product_designs(id),
  title text,
  width numeric,
  height numeric,
  x numeric,
  y numeric
);
`);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table product_design_canvases;
  `);
}
