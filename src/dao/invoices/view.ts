import db from "../../services/db";
import Knex from "knex";

// former invoice_with_payments_view
export function getInvoicesBuilder(ktx: Knex = db): Knex.QueryBuilder {
  return ktx
    .select(
      "i.id",
      "i.created_at",
      "i.deleted_at",
      "i.user_id",
      "i.total_cents",
      "i.title",
      "i.description",
      "i.design_id",
      "i.design_status_id",
      "i.collection_id",
      "i.short_id",
      "i.invoice_address_id",
      ktx.raw("SUM(coalesce(p.total_cents, 0)) AS total_paid"),
      ktx.raw("SUM(coalesce(p.total_cents, 0)) >= i.total_cents AS is_paid"),
      ktx.raw("MAX(p.created_at) AS paid_at")
    )
    .from("invoices as i")
    .joinRaw(
      `
  LEFT OUTER JOIN
    (SELECT total_cents, invoice_id, created_at FROM invoice_payments WHERE deleted_at IS NULL) AS p
    ON i.id = p.invoice_id
    `
    )
    .groupBy("i.id");
}
