import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE partner_payout_logs
ADD COLUMN short_id text;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE partner_payout_logs
DROP COLUMN short_id;
  `);
}
