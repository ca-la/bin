import Knex from "knex";

import db from "../../../../services/db";
import { Task, HandlerResult } from "../../types";
import { sendSlackUpdate } from "./send-slack-update";
import { handleQuotePayment } from "./handle-quote-payment";

export async function postProcessQuotePayment(
  task: Task<"POST_PROCESS_QUOTE_PAYMENT">
): Promise<HandlerResult> {
  const {
    keys: { invoiceId, userId, collectionId },
  } = task;

  await db.transaction(async (trx: Knex.Transaction) =>
    handleQuotePayment(trx, userId, collectionId, invoiceId)
  );

  await sendSlackUpdate({
    invoiceId,
    collectionId,
  });

  return {
    type: "SUCCESS",
    message: null,
  };
}
