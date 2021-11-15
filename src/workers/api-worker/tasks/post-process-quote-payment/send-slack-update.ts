import db from "../../../../services/db";
import * as SlackService from "../../../../services/slack";
import * as UsersDAO from "../../../../components/users/dao";
import { logWarning } from "../../../../services/logger";
import InvoicesDAO from "../../../../dao/invoices";
import * as LineItemsDAO from "../../../../dao/line-items";
import * as CollectionsDAO from "../../../../components/collections/dao";
import TeamsDAO from "../../../../components/teams/dao";
import ResourceNotFoundError from "../../../../errors/resource-not-found";
import { LineItemWithMeta } from "../../../../domain-objects/line-item";

export async function sendSlackUpdate({
  invoiceId,
  collectionId,
}: {
  invoiceId: string;
  collectionId: string;
}) {
  const invoice = await InvoicesDAO.findById(invoiceId);
  if (!invoice) {
    throw new ResourceNotFoundError(
      `Could not find invoice with id ${invoiceId}`
    );
  }
  if (!invoice.userId) {
    throw new ResourceNotFoundError(
      `Invoice ${invoice.id} does not have a user ID`
    );
  }

  const lineItems = await LineItemsDAO.getLineItemsWithMetaByInvoiceId(
    invoiceId
  );
  if (lineItems.length === 0) {
    throw new ResourceNotFoundError(
      `Invoice ${invoice.id} does not have any line items`
    );
  }

  const designer = await UsersDAO.findById(invoice.userId);
  if (!designer) {
    throw new ResourceNotFoundError(
      `Cannot find a designer (${invoice.userId}) for invoice ${invoice.id}`
    );
  }

  const collection = await CollectionsDAO.findById(collectionId);
  if (!collection) {
    throw new ResourceNotFoundError(
      `Cannot find a collection (${collectionId}) for invoice ${invoice.id}`
    );
  }

  const notification: SlackService.SlackBody = {
    channel: "designers",
    templateName: "designer_payment",
    params: {
      collection,
      designer,
      team:
        collection && collection.teamId
          ? await TeamsDAO.findById(db, collection.teamId)
          : null,
      paymentAmountCents: invoice.totalCents,
      costOfGoodsSoldCents: lineItems.reduce(
        (sum: number, lineItem: LineItemWithMeta) =>
          sum + lineItem.quotedUnitCostCents * lineItem.quotedUnits,
        0
      ),
    },
  };

  await SlackService.enqueueSend(notification).catch((e: Error) => {
    logWarning(
      "There was a problem sending the payment notification to Slack",
      e
    );
  });
}
