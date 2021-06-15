import { Task, HandlerResult } from "../../types";
import { sendSlackUpdate } from "./send-slack-update";

export async function postProcessQuotePayment(
  task: Task<"POST_PROCESS_QUOTE_PAYMENT">
): Promise<HandlerResult> {
  const {
    keys: { invoiceId, userId, collectionId, paymentAmountCents },
  } = task;

  await sendSlackUpdate({
    invoiceId,
    userId,
    collectionId,
    paymentAmountCents,
  });

  return {
    type: "SUCCESS",
    message: null,
  };
}
