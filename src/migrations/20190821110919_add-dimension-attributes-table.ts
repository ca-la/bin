import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE dimension_attributes (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  created_by uuid references users(id) not null,
  deleted_at timestamp with time zone,
  node_id uuid references nodes(id),
  width numeric not null,
  height numeric not null
);
CREATE INDEX dimension_attributes_node_id ON dimension_attributes(node_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX dimension_attributes_node_id;
DROP TABLE dimension_attributes;
  `);
}
