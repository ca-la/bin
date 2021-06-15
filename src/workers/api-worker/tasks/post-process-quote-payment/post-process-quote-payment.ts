import Knex from "knex";

import db from "../../../../services/db";
import { Task, HandlerResult } from "../../types";
import { sendSlackUpdate } from "./send-slack-update";
import { handleQuotePayment } from "./handle-quote-payment";

export async function postProcessQuotePayment(
  task: Task<"POST_PROCESS_QUOTE_PAYMENT">
): Promise<HandlerResult> {
  const {
    keys: { invoiceId, userId, collectionId, paymentAmountCents },
  } = task;

  await db.transaction(async (trx: Knex.Transaction) =>
    handleQuotePayment(trx, userId, collectionId)
  );

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
