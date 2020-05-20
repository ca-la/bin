import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE invoice_payments ADD COLUMN resolve_payment_id TEXT;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE invoice_payments DROP COLUMN resolve_payment_id;
  `);
}
