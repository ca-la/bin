import * as Knex from 'knex';

export const UP = `
DROP VIEW invoice_with_payments;
CREATE VIEW invoice_with_payments AS
SELECT
  i.id,
  i.created_at,
  i.deleted_at,
  i.user_id,
  i.total_cents,
  i.title,
  i.description,
  i.design_id,
  i.design_status_id,
  i.collection_id,
  i.short_id,
  SUM(coalesce(p.total_cents, 0)) AS total_paid,
  SUM(coalesce(p.total_cents, 0)) >= i.total_cents AS is_paid,
  MAX(p.created_at) AS paid_at
FROM invoices AS i
  LEFT OUTER JOIN
    (SELECT total_cents, invoice_id, created_at FROM invoice_payments WHERE deleted_at IS NULL) AS p
    ON i.id = p.invoice_id
GROUP BY i.id;
`;

export function up(knex: Knex): Knex.Raw {
  return knex.raw(UP);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW invoice_with_payments;
CREATE VIEW invoice_with_payments AS
SELECT
  i.id,
  i.created_at,
  i.deleted_at,
  i.user_id,
  i.total_cents,
  i.title,
  i.description,
  i.design_id,
  i.design_status_id,
  i.collection_id,
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
