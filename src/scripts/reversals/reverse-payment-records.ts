import Knex from "knex";
import { map } from "lodash";
import uuid from "node-uuid";

import db from "../../services/db";
import Logger = require("../../services/logger");
import ApprovalStepDAO from "../../components/approval-steps/dao";
import DesignEventsDAO from "../../components/design-events/dao";
import { ApprovalStepState, ApprovalStepType } from "../../published-types";
import { templateDesignEvent } from "../../components/design-events/types";
import { CALA_OPS_USER_ID } from "../../config";

interface WithIds {
  id: string;
}

function isRowsOfIds(candidate: any): candidate is WithIds[] {
  return (
    candidate !== null &&
    Array.isArray(candidate) &&
    candidate.every((data: { id?: any }) => typeof data.id === "string") &&
    candidate.length > 0
  );
}

/**
 * Rolls back a collection that was checked out to a pre-checkout state.
 */
async function reversePaymentRecords(): Promise<void> {
  const collectionId = process.argv[2];

  if (!collectionId) {
    throw new Error("Usage: reverse-payment-records.ts [collection ID]");
  }

  return db.transaction(async (trx: Knex.Transaction) => {
    const lineItems = await db
      .select("id")
      .from("line_items")
      .whereIn("invoice_id", (query: Knex.QueryBuilder) => {
        query
          .select("id")
          .from("invoices")
          .where({ collection_id: collectionId });
      })
      .transacting(trx);

    const invoices = await db
      .select("id")
      .from("invoices")
      .where({ collection_id: collectionId })
      .transacting(trx);

    const designEvents = await db
      .select("id")
      .from("design_events")
      .whereIn("design_id", (query: Knex.QueryBuilder) => {
        query
          .select("design_id")
          .from("collection_designs")
          .where({ collection_id: collectionId });
      })
      .andWhere({ type: "COMMIT_QUOTE" })
      .transacting(trx);

    Logger.log(
      `Found: ${lineItems.length} Invoice Line Items, ${invoices.length} Invoices, and ${designEvents.length} Design Events`
    );

    if (!isRowsOfIds(lineItems)) {
      throw new Error(`No line items found for collection ${collectionId}`);
    }

    if (!isRowsOfIds(invoices)) {
      throw new Error(`No invoices found for collection ${collectionId}`);
    }

    if (!isRowsOfIds(designEvents)) {
      throw new Error(`No design events found for collection ${collectionId}`);
    }

    const steps = await db
      .select("*")
      .from("design_approval_steps")
      .join(
        "collection_designs",
        "collection_designs.design_id",
        "design_approval_steps.design_id"
      )
      .where({ "collection_designs.collection_id": collectionId })
      .whereNot({ state: ApprovalStepState.SKIP });

    for (const step of steps) {
      await DesignEventsDAO.create(trx, {
        ...templateDesignEvent,
        actorId: CALA_OPS_USER_ID,
        approvalStepId: step.id,
        createdAt: new Date(),
        designId: step.design_id,
        id: uuid.v4(),
        type: "STEP_REOPEN",
      });

      if (step.type === ApprovalStepType.CHECKOUT) {
        await ApprovalStepDAO.update(trx, step.id, {
          state: ApprovalStepState.CURRENT,
          completedAt: null,
        });
      } else {
        await ApprovalStepDAO.update(trx, step.id, {
          state:
            step.state === ApprovalStepState.BLOCKED
              ? ApprovalStepState.BLOCKED
              : ApprovalStepState.UNSTARTED,
          completedAt: null,
          startedAt: null,
        });
      }
    }

    const invoicePayments = await db
      .select("id")
      .from("invoice_payments")
      .whereIn("invoice_id", map(invoices, "id"))
      .transacting(trx);

    Logger.log(`Found: ${invoicePayments.length} Invoice Payments`);

    let invoicePaymentsDeleted = 0;
    if (isRowsOfIds(invoicePayments)) {
      invoicePaymentsDeleted = await db
        .del()
        .from("invoice_payments")
        .whereIn("id", map(invoicePayments, "id"))
        .transacting(trx);
      Logger.log(`Deleted ${invoicePaymentsDeleted} invoice payments`);

      if (invoicePaymentsDeleted !== invoicePayments.length) {
        throw new Error(
          "Removed a different number of invoice payments than expected. Rolling back transaction!"
        );
      }
    }

    const lineItemsDeleted: number = await db
      .del()
      .from("line_items")
      .whereIn("id", map(lineItems, "id"))
      .transacting(trx);
    Logger.log(`Deleted ${lineItemsDeleted} line items`);

    if (lineItemsDeleted !== lineItems.length) {
      throw new Error(
        "Removed a different number of line items than expected. Rolling back transaction!"
      );
    }

    const invoicesDeleted: number = await db
      .del()
      .from("invoices")
      .whereIn("id", map(invoices, "id"))
      .transacting(trx);
    Logger.log(`Deleted ${invoicesDeleted} invoices`);

    if (invoicesDeleted !== invoices.length) {
      throw new Error(
        "Removed a different number of invoices than expected. Rolling back transaction!"
      );
    }

    const designEventsDeleted: number = await db
      .del()
      .from("design_events")
      .whereIn("id", map(designEvents, "id"))
      .transacting(trx);
    Logger.log(`Deleted ${designEventsDeleted} design events`);

    if (designEventsDeleted !== designEvents.length) {
      throw new Error(
        "Removed a different number of design events than expected. Rolling back transaction!"
      );
    }

    Logger.log("Success!");
    Logger.log(`
## Reminder ##

No actual payment refund has been issued, only records removed. If the user has
paid for this collection, you must still refund them by whatever means is
appropriate (credit_transactions, Stripe, Resolve, etc)`);
  });
}

reversePaymentRecords()
  .then(() => {
    process.exit(0);
  })
  .catch((err: Error) => {
    Logger.logServerError(err);
    process.exit(1);
  });
