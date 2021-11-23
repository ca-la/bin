import Knex from "knex";

import { test, Test, db } from "../../test-helpers/fresh";
import { checkout } from "../../test-helpers/checkout-collection";
import * as LineItemsDAO from "../../dao/line-items";

import * as CreditNotesDAO from "./dao";
import { CreditNoteDb } from "./types";

test("CreditNotesDAO.create", async (t: Test) => {
  const {
    invoice,
    user: { designer },
  } = await checkout();
  const lineItems = await LineItemsDAO.findByInvoiceId(invoice.id);

  await db.transaction(async (trx: Knex.Transaction) => {
    const unsavedNoteDb: Unsaved<CreditNoteDb> = {
      cancelledAt: null,
      invoiceId: invoice.id,
      reason: "Not enough detail to fulfill cost obligation",
      totalCents: invoice.totalCents,
      userId: designer.user.id,
    };

    const created = await CreditNotesDAO.create(
      trx,
      unsavedNoteDb,
      lineItems.map(({ id }: { id: string }) => ({
        lineItemId: id,
      }))
    );

    t.deepEqual(
      await trx("credit_notes").count("*").where({ id: created.id }),
      [{ count: "1" }],
      "inserts the credit note row"
    );

    t.deepEqual(
      await trx("credit_note_line_items")
        .count("*")
        .where({ credit_note_id: created.id }),
      [{ count: "2" }],
      "inserts a credit note line item row for each design"
    );
  });
});
