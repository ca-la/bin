import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW product_design_images;
ALTER TABLE images RENAME TO assets;
CREATE VIEW product_design_images AS SELECT * FROM assets;

CREATE TABLE nodes (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  created_by uuid references users(id),
  deleted_at timestamp with time zone,
  parent_id uuid references nodes(id),
  x numeric not null,
  y numeric not null,
  ordering integer not null,
  title text
);

CREATE TABLE design_root_nodes (
  id uuid primary key,
  node_id uuid references nodes(id),
  design_id uuid references product_designs(id)
);

CREATE TABLE artwork_attributes (
  node_id uuid references nodes(id) not null,
  asset_id uuid references assets(id) not null,
  x numeric not null,
  y numeric not null,
  width numeric not null,
  height numeric not null
);

CREATE TABLE material_attributes (
  node_id uuid references nodes(id) not null,
  asset_id uuid references assets(id) not null,
  width numeric not null,
  height numeric not null
);

CREATE TABLE sketch_attributes (
  node_id uuid references nodes(id) not null,
  asset_id uuid references assets(id) not null,
  x numeric not null,
  y numeric not null,
  width numeric not null,
  height numeric not null
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE artwork_attributes;
DROP TABLE material_attributes;
DROP TABLE sketch_attributes;
DROP TABLE design_root_nodes;
DROP TABLE nodes;

DROP VIEW product_design_images;
ALTER TABLE assets RENAME TO images;
CREATE VIEW product_design_images AS SELECT * FROM images;
  `);
}
