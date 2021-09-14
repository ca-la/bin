import Knex from "knex";

import createUPCsForCollection from "../../../../services/create-upcs-for-collection";
import createSKUsForCollection from "../../../../services/create-skus-for-collection";
import { createShopifyProductsForCollection } from "../../../../services/create-shopify-products";
import { determineSubmissionStatus } from "../../../../components/collections/services/determine-submission-status";
import * as IrisService from "../../../../components/iris/send-message";
import { realtimeCollectionStatusUpdated } from "../../../../components/collections/realtime";
import DesignEventsDAO from "../../../../components/design-events/dao";
import { DesignEventWithMeta } from "../../../../components/design-events/types";
import { realtimeDesignEventCreated } from "../../../../components/design-events/realtime";
import ApprovalStepsDAO from "../../../../components/approval-steps/dao";
import { realtimeApprovalStepListUpdated } from "../../../../components/approval-steps/realtime";
import { logServerError } from "../../../../services/logger";

export async function handleQuotePayment(
  trx: Knex.Transaction,
  userId: string,
  collectionId: string,
  invoiceId: string
): Promise<void> {
  await createUPCsForCollection(trx, collectionId);
  await createSKUsForCollection(trx, collectionId);
  await createShopifyProductsForCollection(
    trx,
    userId,
    collectionId
  ).catch((err: Error): void =>
    logServerError(
      `Create Shopify Products for user ${userId} - Collection ${collectionId}: `,
      err
    )
  );
  await sendCollectionStatusUpdated(trx, collectionId);
  await sendApprovalStepsUpdates(trx, collectionId);
  await sendQuotesDesignEvents(trx, invoiceId);
}

async function sendApprovalStepsUpdates(
  trx: Knex.Transaction,
  collectionId: string
): Promise<void> {
  const approvalSteps = await ApprovalStepsDAO.findByCollection(
    trx,
    collectionId
  );

  await IrisService.sendMessage(
    realtimeApprovalStepListUpdated(collectionId, approvalSteps)
  );
}

async function sendQuotesDesignEvents(
  trx: Knex.Transaction,
  invoiceId: string
): Promise<void> {
  const designEvents = await DesignEventsDAO.findCommitQuoteByInvoiceEvents(
    trx,
    invoiceId
  );

  await Promise.all(
    designEvents.map((withMeta: DesignEventWithMeta) =>
      IrisService.sendMessage(realtimeDesignEventCreated(withMeta))
    )
  );
}

async function sendCollectionStatusUpdated(
  trx: Knex.Transaction,
  collectionId: string
): Promise<void> {
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
