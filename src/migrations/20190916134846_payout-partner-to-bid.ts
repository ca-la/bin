import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE partner_payout_logs
      ADD COLUMN bid_id uuid REFERENCES pricing_bids,
      ADD COLUMN is_manual boolean DEFAULT false,
      ALTER COLUMN invoice_id DROP NOT NULL,
      ALTER COLUMN payout_account_id DROP NOT NULL,
      ADD CONSTRAINT invoice_or_bid CHECK (
        bid_id IS NOT NULL or invoice_id IS NOT NULL
      );
  `);
}

/**
 * This migration will fail if payout logs are created using a bid id.
 * To prevent losing payout logs  manual DB edits are needed
 * before backing up
 */
export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE partner_payout_logs
      DROP CONSTRAINT invoice_or_bid,
      DROP COLUMN bid_id,
      DROP COLUMN is_manual,
      ALTER COLUMN invoice_id SET NOT NULL,
      ALTER COLUMN payout_account_id SET NOT NULL;
  `);
}
