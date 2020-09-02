import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE collections
  ADD COLUMN team_id UUID REFERENCES teams (id);

CREATE INDEX team_collections_partial_idx
    ON collections (team_id)
 WHERE team_id IS NOT NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX team_collections_partial_idx;
ALTER TABLE collections
 DROP COLUMN team_id;
  `);
}
