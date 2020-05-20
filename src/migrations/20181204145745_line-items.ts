import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE invoices ADD collection_id uuid REFERENCES collections(id);
DROP VIEW invoice_with_payments;
CREATE VIEW invoice_with_payments AS
SELECT
  i.*,
  SUM(coalesce(p.total_cents, 0)) AS total_paid,
  SUM(coalesce(p.total_cents, 0)) = i.total_cents AS is_paid,
  MAX(p.created_at) AS paid_at
FROM invoices AS i
  LEFT OUTER JOIN
    (SELECT * FROM invoice_payments WHERE deleted_at IS NULL) AS p
    ON i.id = p.invoice_id
GROUP BY i.id;

CREATE TABLE line_items (
  id UUID PRIMARY KEY,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  design_id UUID REFERENCES product_designs(id),
  quote_id UUID REFERENCES pricing_quotes(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id)
);

CREATE VIEW invoice_line_items AS
  SELECT i.id as invoice_id, i.user_id as user_id, i.title as invoice_title,
    i.description as invoice_description, i.total_cents as invoice_total_cents,
    l.title as line_item_title, l.description as line_item_description,
    q.product_type as line_item_product_type, q.units as line_item_units,
    q.unit_cost_cents as line_item_unit_cost_cents,
    q.units * q.unit_cost_cents as line_item_price_cents
  FROM invoices as i
  JOIN line_items as l ON i.id = l.invoice_id
  JOIN pricing_quotes as q ON l.quote_id = q.id;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW invoice_with_payments;
ALTER TABLE invoices DROP collection_id;
CREATE VIEW invoice_with_payments AS
SELECT
  i.*,
  SUM(coalesce(p.total_cents, 0)) AS total_paid,
  SUM(coalesce(p.total_cents, 0)) = i.total_cents AS is_paid,
  MAX(p.created_at) AS paid_at
FROM invoices AS i
  LEFT OUTER JOIN
    (SELECT * FROM invoice_payments WHERE deleted_at IS NULL) AS p
    ON i.id = p.invoice_id
GROUP BY i.id;
DROP VIEW invoice_line_items;
DROP TABLE line_items;
  `);
}
