import * as SlackService from "../../../../services/slack";
import * as UsersDAO from "../../../../components/users/dao";
import * as CollectionsDAO from "../../../../components/collections/dao";
import { logWarning } from "../../../../services/logger";

export async function sendSlackUpdate({
  invoiceId,
  userId,
  collectionId,
  paymentAmountCents,
}: {
  invoiceId: string;
  userId: string;
  collectionId: string;
  paymentAmountCents: number;
}) {
  const designer = await UsersDAO.findById(userId);
  if (!designer) {
    throw new Error(
      `Cannot find a designer (${userId}) for invoice ${invoiceId}`
    );
  }

  const collection = await CollectionsDAO.findById(collectionId);
  if (!collection) {
    throw new Error(
      `Cannot find a collection (${collectionId}) for invoice ${invoiceId}`
    );
  }

  const notification: SlackService.SlackBody = {
    channel: "designers",
    templateName: "designer_payment",
    params: {
      collection,
      designer,
      paymentAmountCents,
    },
  };

  await SlackService.enqueueSend(notification).catch((e: Error) => {
    logWarning(
      "There was a problem sending the payment notification to Slack",
      e
    );
  });
}
