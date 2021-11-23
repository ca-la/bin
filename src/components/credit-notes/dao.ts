import Knex from "knex";
import uuid from "node-uuid";

import { adapter } from "./adapter";
import { CreditNote, CreditNoteDb } from "./types";

export async function create(
  trx: Knex.Transaction,
  creditNote: Unsaved<CreditNoteDb>,
  lineItems: { lineItemId: string }[]
): Promise<CreditNote> {
  const creditNoteId = uuid.v4();
  const note: CreditNote = {
    ...creditNote,
    id: creditNoteId,
    createdAt: new Date(),
    lineItems: lineItems.map(({ lineItemId }: { lineItemId: string }) => ({
      id: uuid.v4(),
      createdAt: new Date(),
      lineItemId,
      creditNoteId,
      cancelledAt: null,
    })),
  };
  const { line_items: lineItemRows, ...noteRow } = adapter.toDb(note);

  await trx("credit_notes").insert(noteRow);

  await trx("credit_note_line_items").insert(lineItemRows);

  return note;
}
