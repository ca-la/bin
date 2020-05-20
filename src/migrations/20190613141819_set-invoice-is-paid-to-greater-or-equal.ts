import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW invoice_with_payments;
CREATE VIEW invoice_with_payments AS
SELECT
  i.*,
  SUM(coalesce(p.total_cents, 0)) AS total_paid,
  SUM(coalesce(p.total_cents, 0)) >= i.total_cents AS is_paid,
  MAX(p.created_at) AS paid_at
FROM invoices AS i
  LEFT OUTER JOIN
    (SELECT total_cents, invoice_id, created_at FROM invoice_payments WHERE deleted_at IS NULL) AS p
    ON i.id = p.invoice_id
GROUP BY i.id;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW invoice_with_payments;
CREATE VIEW invoice_with_payments AS
SELECT
  i.*,
  SUM(coalesce(p.total_cents, 0)) AS total_paid,
  SUM(coalesce(p.total_cents, 0)) = i.total_cents AS is_paid,
  MAX(p.created_at) AS paid_at
FROM invoices AS i
LEFT JOIN ( SELECT invoice_payments.id,
            invoice_payments.created_at,
            invoice_payments.deleted_at,
            invoice_payments.invoice_id,
            invoice_payments.total_cents,
            invoice_payments.payment_method_id,
            invoice_payments.stripe_charge_id,
            invoice_payments.rumbleship_purchase_hash
           FROM invoice_payments
          WHERE invoice_payments.deleted_at IS NULL) p ON i.id = p.invoice_id
GROUP BY i.id;

  `);
}
