import Knex from "knex";
import rethrow = require("pg-rethrow");

import Invoice = require("../../domain-objects/invoice");
import InvoiceAddress, {
  keyNamesByColumnName as iaKeyMap,
} from "../../domain-objects/invoice-address";
import limitOrOffset from "../../services/limit-or-offset";
import { getInvoicesBuilder } from "./view";
import { mapKeys, omit, pick } from "lodash";

const instantiate = (row: any): Invoice => {
  const invoice = new Invoice(
    pick(row, Object.keys(Invoice.keyNamesByColumnName))
  );
  invoice.invoiceAddress = row["ia.id"]
    ? new InvoiceAddress(
        mapKeys(
          omit(row, Object.keys(Invoice.keyNamesByColumnName)),
          (_: any, key: string) => key.replace(/^ia\./, "")
        )
      )
    : null;
  return invoice;
};

export async function getInvoicesByUser(options: {
  limit?: number;
  offset?: number;
  trx?: Knex.Transaction;
  userId: string;
}): Promise<Invoice[]> {
  return getInvoicesBuilder()
    .where({ "i.deleted_at": null, "i.user_id": options.userId })
    .leftJoin("invoice_addresses as ia", "ia.id", "i.invoice_address_id")
    .select(
      Object.keys(iaKeyMap).map((key: string) => `ia.${key} as ia.${key}`)
    )
    .orderBy("i.created_at", "desc")
    .groupBy("ia.id")
    .modify(limitOrOffset(options.limit, options.offset))
    .modify((query: Knex.QueryBuilder) => {
      if (options.trx) {
        query.transacting(options.trx);
      }
    })
    .then((invoices: any) => invoices.map(instantiate))
    .catch(rethrow);
}
