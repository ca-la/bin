import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE notifications
  ADD COLUMN recipient_user_invite_email TEXT;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE notifications
 DROP COLUMN recipient_user_invite_email;
  `);
}
