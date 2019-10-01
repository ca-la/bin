import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX artwork_attributes_node_id;
DROP TABLE artwork_attributes;
DROP VIEW sketch_attributes;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE artwork_attributes (
  node_id uuid references nodes(id) not null,
  asset_id uuid references assets(id) not null,
  x numeric not null,
  y numeric not null,
  width numeric not null,
  height numeric not null,
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  created_by uuid references users(id) not null,
  deleted_at timestamp with time zone
);
CREATE INDEX artwork_attributes_node_id ON artwork_attributes(node_id);
CREATE VIEW sketch_attributes AS SELECT * FROM image_attributes;
`);
}
