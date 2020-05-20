import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_approval_steps ADD COLUMN collaborator_id UUID REFERENCES collaborators(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_approval_steps DROP COLUMN collaborator_id;
  `);
}
