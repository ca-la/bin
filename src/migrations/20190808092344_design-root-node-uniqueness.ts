import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_root_nodes
  ALTER COLUMN node_id SET NOT NULL,
  ALTER COLUMN design_id SET NOT NULL,
  ADD CONSTRAINT unique_pairing UNIQUE (node_id, design_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_root_nodes
  ALTER COLUMN node_id DROP NOT NULL,
  ALTER COLUMN design_id DROP NOT NULL,
  DROP CONSTRAINT unique_pairing;
  `);
}
