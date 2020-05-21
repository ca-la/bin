import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE notifications
      ADD COLUMN recipient_collaborator_id uuid references collaborators(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE notifications
      DROP COLUMN recipient_collaborator_id;
  `);
}
