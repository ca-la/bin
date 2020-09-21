import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE teams
  ADD COLUMN type TEXT NOT NULL DEFAULT 'DESIGNER';

CREATE INDEX teams_type_partial_idx ON teams (type) WHERE deleted_at IS NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX teams_type_partial_idx;

ALTER TABLE teams
 DROP COLUMN type;
  `);
}
