import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE notifications
      ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE notifications
      DROP COLUMN archived_at;
  `);
}
