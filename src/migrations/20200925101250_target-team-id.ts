import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_events
  ADD COLUMN target_team_id UUID REFERENCES teams (id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_events
 DROP COLUMN target_team_id;
  `);
}
