import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE financing_accounts (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  team_id UUID NOT NULL REFERENCES teams (id),
  term_length_days INT NOT NULL,
  fee_basis_points SMALLINT NOT NULL,
  credit_limit_cents BIGINT NOT NULL
);

ALTER TABLE credit_transactions
  ADD COLUMN financing_account_id UUID REFERENCES financing_accounts (id),
ALTER COLUMN given_to DROP NOT NULL,
  ADD CONSTRAINT account_or_user CHECK (
  financing_account_id IS NOT NULL
  OR
  given_to IS NOT NULL
);

ALTER TABLE invoice_payments
  ADD COLUMN credit_transaction_id UUID REFERENCES credit_transactions (id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE invoice_payments
 DROP COLUMN credit_transaction_id;

ALTER TABLE credit_transactions
 DROP CONSTRAINT account_or_user,
 DROP COLUMN financing_account_id,
ALTER COLUMN given_to SET NOT NULL;

DROP TABLE financing_accounts;
  `);
}
