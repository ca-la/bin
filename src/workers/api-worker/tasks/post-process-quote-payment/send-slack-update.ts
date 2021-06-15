import * as SlackService from "../../../../services/slack";
import * as UsersDAO from "../../../../components/users/dao";
import { logWarning } from "../../../../services/logger";
import InvoicesDAO from "../../../../dao/invoices";
import * as CollectionsDAO from "../../../../components/collections/dao";
import ResourceNotFoundError from "../../../../errors/resource-not-found";

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
      paymentAmountCents: invoice.totalCents,
    },
  };

  await SlackService.enqueueSend(notification).catch((e: Error) => {
    logWarning(
      "There was a problem sending the payment notification to Slack",
      e
    );
  });
}
