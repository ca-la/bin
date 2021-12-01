import Knex from "knex";
import uuid from "node-uuid";

import * as CreditNotesDAO from "../components/credit-notes/dao";
import * as DesignEventsDAO from "../components/design-events/dao";
import * as ApprovalStepsDAO from "../components/approval-steps/dao";
import ApprovalStep, {
  ApprovalStepState,
} from "../components/approval-steps/types";
import { determineSubmissionStatus } from "../components/collections/services/determine-submission-status";
import { realtimeCollectionStatusUpdated } from "../components/collections/realtime";
import * as IrisService from "../components/iris/send-message";
import DesignEvent, {
  allEventsSchema,
  templateDesignEvent,
} from "../components/design-events/types";
import ResourceNotFoundError from "../errors/resource-not-found";

interface ActiveInvoiceRow {
  id: string;
  total_cents: string;
  line_items: { design_id: string; id: string }[];
}

async function findActiveInvoice(trx: Knex.Transaction, collectionId: string) {
  const activeInvoice = await trx
    .select<ActiveInvoiceRow>([
      "id",
      trx.raw(`(total_invoice_cents - total_credit_note_cents) as total_cents`),
      trx.raw(`
(
  SELECT jsonb_agg(li.*) FROM line_items AS li
   WHERE li.invoice_id = invoices.id
) as line_items`),
    ])
    .from(
      trx.raw(`
(
  SELECT
    i.id,
    i.collection_id,
    i.total_cents AS total_invoice_cents,
    COALESCE((
      SELECT SUM(cn.total_cents) FROM credit_notes AS cn
       WHERE invoice_id = i.id
       GROUP BY invoice_id
    ), 0) AS total_credit_note_cents
    FROM invoices AS i
) as invoices
`)
    )
    .where({ collection_id: collectionId })
    .andWhere(trx.raw("(total_invoice_cents - total_credit_note_cents) > 0"))
    .first();

  if (!activeInvoice) {
    throw new ResourceNotFoundError(
      `Could not find an active invoice for collection ${collectionId}`
    );
  }

  return activeInvoice;
}

export async function reverseCollectionCheckout(
  trx: Knex.Transaction,
  collectionId: string,
  actorId: string
) {
  const activeInvoice = await findActiveInvoice(trx, collectionId);

  await CreditNotesDAO.create(
    trx,
    {
      cancelledAt: null,
      invoiceId: activeInvoice.id,
      reason: "Reversed",
      totalCents: parseInt(activeInvoice.total_cents, 10),
      userId: actorId,
    },
    activeInvoice.line_items.map(({ id }: { id: string }) => ({
      lineItemId: id,
    }))
  );

  const designEvents: DesignEvent[] = [];

  for (const { design_id: designId } of activeInvoice.line_items) {
    designEvents.push({
      ...templateDesignEvent,
      createdAt: new Date(),
      id: uuid.v4(),
      designId,
      type: allEventsSchema.enum.REVERSE_CHECKOUT,
      actorId,
    });

    const designSteps = await ApprovalStepsDAO.findByDesign(trx, designId);

    const stepsToUpdate = designSteps
      .filter(
        (step: ApprovalStep) => step.state === ApprovalStepState.COMPLETED
      )
      .sort((a: ApprovalStep, b: ApprovalStep) => b.ordering - a.ordering);

    for (const stepToUpdate of stepsToUpdate) {
      await ApprovalStepsDAO.update(trx, stepToUpdate.id, {
        state: ApprovalStepState.CURRENT,
      });
    }
  }

  await DesignEventsDAO.createAll(trx, designEvents);

  const statusByCollectionId = await determineSubmissionStatus(
    [collectionId],
    trx
  );
  const collectionStatus = statusByCollectionId[collectionId];
  if (!collectionStatus) {
    throw new Error(`Could not get the status for collection ${collectionId}`);
  }

  await IrisService.sendMessage(
    realtimeCollectionStatusUpdated(collectionStatus)
  );
}
