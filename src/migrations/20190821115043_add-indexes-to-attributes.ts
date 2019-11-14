import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE INDEX sketch_attributes_node_id ON sketch_attributes(node_id);
CREATE INDEX artwork_attributes_node_id ON artwork_attributes(node_id);
CREATE INDEX material_attributes_node_id ON material_attributes(node_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX sketch_attributes_node_id;
DROP INDEX artwork_attributes_node_id;
DROP INDEX material_attributes_node_id;
  `);
}
