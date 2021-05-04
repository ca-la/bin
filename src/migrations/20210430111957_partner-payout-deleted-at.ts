import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE partner_payout_logs
  ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE partner_payout_logs
 DROP COLUMN deleted_at;
  `);
}
