import process from "process";
import { log, logServerError } from "../../services/logger";
import { green, reset } from "../../services/colors";
import db from "../../services/db";
import Knex from "knex";
import { formatCentsToDollars } from "@cala/ts-lib";

run()
  .then(() => {
    log(green, `Success!`, reset);
    process.exit();
  })
  .catch((err: any): void => {
    logServerError(err);
    process.exit(1);
  });

async function run(): Promise<void> {
  const collectionId = process.argv[2];
  const designIds = process.argv.slice(3);

  if (!collectionId || !designIds) {
    throw new Error(
      "Usage: reverse-design-checkout.ts [collectionId] [designId]"
    );
  }

  return db.transaction(async (trx: Knex.Transaction) => {
    const invoices = await trx("invoices").where({
      collection_id: collectionId,
    });

    if (invoices.length !== 1) {
      throw new Error("Could not find an invoice");
    }

    const quotes = await trx("pricing_quotes")
      .select("pricing_quotes.*")
      .join("design_events", "design_events.quote_id", "pricing_quotes.id")
      .whereIn("pricing_quotes.design_id", designIds)
      .andWhere({ type: "COMMIT_QUOTE" })
      .orderBy("created_at", "desc");

    if (quotes.length !== designIds.length) {
      throw new Error("Did not find a quote for each design");
    }

    const totalCentsRemoved = quotes.reduce(
      (acc: number, quote: any) => acc + quote.unit_cost_cents * quote.units,
      0
    );
    const newTotalCents = invoices[0].total_cents - totalCentsRemoved;

    if (newTotalCents < 0) {
      throw new Error("Updated cost would result in a negative value");
    }

    const updated = (
      await trx("invoices")
        .update({ total_cents: newTotalCents })
        .where({ id: invoices[0].id })
        .returning("total_cents")
    )[0];

    log(
      `Removed ${formatCentsToDollars(
        totalCentsRemoved
      )} for a new invoice total of ${formatCentsToDollars(updated)}`
    );

    const collectionDesignsDeleted: number = await trx("collection_designs")
      .del()
      .whereIn("design_id", designIds)
      .andWhere({ collection_id: collectionId });

    log(`Removed ${collectionDesignsDeleted} designs from the collection`);
    if (collectionDesignsDeleted !== designIds.length) {
      logServerError(
        `Removed an unexpected number of designs from collection. Expected ${designIds.length}, actual was ${collectionDesignsDeleted}`
      );
    }

    const lineItemsDeleted = await trx("line_items")
      .del()
      .whereIn("design_id", designIds)
      .whereIn("invoice_id", (query: Knex.QueryBuilder) => {
        query
          .select("id")
          .from("invoices")
          .where({ collection_id: collectionId });
      });

    log(`Deleted ${lineItemsDeleted} line items`);

    const designEventsDeleted = await trx("design_events")
      .del()
      .from("design_events")
      .whereIn("design_id", designIds)
      .andWhere({ type: "COMMIT_QUOTE" });

    log(`Deleted ${designEventsDeleted} COMMIT_QUOTE design events`);
  });
}
