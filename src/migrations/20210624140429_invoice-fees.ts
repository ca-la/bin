import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE invoice_fees (
  id UUID PRIMARY KEY,
  title TEXT,
  description TEXT,
  invoice_id UUID REFERENCES invoices (id),
  type TEXT NOT NULL,
  total_cents INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

DROP VIEW invoice_line_items;

CREATE VIEW invoice_line_items AS
SELECT
  'DESIGN' AS type,
  i.id AS invoice_id,
  i.user_id,
  i.title AS invoice_title,
  i.description AS invoice_description,
  i.total_cents AS invoice_total_cents,
  l.title AS line_item_title,
  l.description AS line_item_description,
  q.product_type AS line_item_product_type,
  q.units AS line_item_units,
  q.unit_cost_cents AS line_item_unit_cost_cents,
  q.units * q.unit_cost_cents AS line_item_price_cents
  FROM invoices i
  JOIN line_items l ON i.id = l.invoice_id
  JOIN pricing_quotes q ON l.quote_id = q.id

 UNION ALL

SELECT
  f.type,
  i.id AS invoice_id,
  i.user_id,
  i.title AS invoice_title,
  i.description AS invoice_description,
  i.total_cents AS invoice_total_cents,
  f.title AS line_item_title,
  f.description AS line_item_description,
  NULL AS line_item_product_type,
  1 AS line_item_units,
  f.total_cents AS line_item_unit_cost_cents,
  f.total_cents AS line_item_price_cents
  FROM invoices i
  JOIN invoice_fees f ON i.id = f.invoice_id
;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW invoice_line_items;

CREATE VIEW invoice_line_items AS
SELECT
  i.id AS invoice_id,
  i.user_id,
  i.title AS invoice_title,
  i.description AS invoice_description,
  i.total_cents AS invoice_total_cents,
  l.title AS line_item_title,
  l.description AS line_item_description,
  q.product_type AS line_item_product_type,
  q.units AS line_item_units,
  q.unit_cost_cents AS line_item_unit_cost_cents,
  q.units * q.unit_cost_cents AS line_item_price_cents
  FROM invoices i
  JOIN line_items l ON i.id = l.invoice_id
  JOIN pricing_quotes q ON l.quote_id = q.id;

DROP TABLE invoice_fees;
  `);
}
