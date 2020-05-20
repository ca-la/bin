import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_approval_submissions
  ADD COLUMN user_id UUID REFERENCES users(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE design_approval_submissions
  DROP COLUMN user_id;
  `);
}
