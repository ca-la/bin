import Knex from "knex";
import rethrow = require("pg-rethrow");

import db from "../../services/db";
import LineItem, {
  dataAdapter,
  dataAdapterMeta,
  isLineItem,
  isLineItemRow,
  isLineItemWithMetaRow,
  LineItemRow,
  LineItemWithMeta,
  LineItemWithMetaRow,
} from "../../domain-objects/line-item";
import first from "../../services/first";
import { validate, validateEvery } from "../../services/validate-from-db";

const TABLE_NAME = "line_items";

export async function create(
  data: LineItem,
  ktx: Knex = db
): Promise<LineItem> {
  if (!data || !isLineItem(data)) {
    throw new Error("Invalid data");
  }
  const rowData = dataAdapter.forInsertion(data);
  const created = await ktx(TABLE_NAME)
    .insert(rowData, "*")
    .then((rows: LineItemRow[]) => first<LineItemRow>(rows));

  if (!created) {
    throw new Error("Failed to create rows");
  }

  return validate<LineItemRow, LineItem>(
    TABLE_NAME,
    isLineItemRow,
    dataAdapter,
    created
  );
}

export async function createAll(
  trx: Knex.Transaction,
  data: LineItem[]
): Promise<LineItem[]> {
  const rowData = data.map(dataAdapter.forInsertion.bind(dataAdapter));
  const created = await trx(TABLE_NAME).insert(rowData, "*");

  if (created.length !== data.length) {
    throw new Error("Created count does not match line item input count");
  }

  return validateEvery<LineItemRow, LineItem>(
    TABLE_NAME,
    isLineItemRow,
    dataAdapter,
    created
  );
}

export async function findById(
  id: string,
  ktx: Knex = db
): Promise<LineItem | null> {
  const lineItem = await ktx<LineItemRow>(TABLE_NAME)
    .select("*")
    .where({ id })
    .first();

  if (!lineItem) {
    return null;
  }

  return validate<LineItemRow, LineItem>(
    TABLE_NAME,
    isLineItemRow,
    dataAdapter,
    lineItem
  );
}

export async function findByInvoiceId(
  invoiceId: string,
  ktx: Knex = db
): Promise<LineItem[]> {
  const lineItems = await ktx(TABLE_NAME)
    .select("*")
    .where({ invoice_id: invoiceId });

  return validateEvery<LineItemRow, LineItem>(
    TABLE_NAME,
    isLineItemRow,
    dataAdapter,
    lineItems
  );
}

export async function getLineItemsWithMetaByInvoiceId(
  invoiceId: string,
  ktx: Knex = db
): Promise<LineItemWithMeta[]> {
  const lineItemsWithMeta = await ktx(TABLE_NAME)
    .select(
      "li.*",
      "designs.title AS design_title",
      "designs.collections AS design_collections",
      "designs.image_ids AS design_image_ids",
      "q.units AS quoted_units",
      "q.unit_cost_cents AS quoted_unit_cost_cents"
    )
    .from("line_items AS li")
    .leftJoin("pricing_quotes AS q", "q.id", "li.quote_id")
    .leftJoin(
      "product_designs_with_metadata AS designs",
      "designs.id",
      "li.design_id"
    )
    .where({ "li.invoice_id": invoiceId })
    .catch(rethrow);

  return validateEvery<LineItemWithMetaRow, LineItemWithMeta>(
    TABLE_NAME,
    isLineItemWithMetaRow,
    dataAdapterMeta,
    lineItemsWithMeta
  );
}
