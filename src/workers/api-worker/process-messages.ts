import { fetchResources, deleteResources } from "./aws";
import { log, logServerError } from "../../services/logger";
import { MessageHandler } from "./message-handler";

export async function processMessages(handler: MessageHandler): Promise<void> {
  let message;
  try {
    const response = await fetchResources();
    message = response.message;
  } catch (e) {
    logServerError("Error in fetchResources: ", e);
  }

  if (!message) {
    return;
  }

  try {
    const response = await handler(message);
    log(
      "Message handler responded with: \n",
      JSON.stringify(response, null, 2)
    );
  } catch (e) {
    logServerError("Error in handler: ", e);
  }

  if (!message.ReceiptHandle) {
    logServerError(
      `Message ${message.MessageId} does not contain a ReceiptHandle!`
    );
    return;
  }

  try {
    await deleteResources(message.ReceiptHandle);
  } catch (e) {
    logServerError("Error in deleteResources: ", e);
  }
}

/**
 * Indefinitely consumes messages from the SQS queue.
 * If an error is caught from the infinite loop, we log it and continue.
 */
export async function processMessagesLoop(
  handler: MessageHandler
): Promise<void> {
  while (true) {
    await processMessages(handler).catch((error: Error) => {
      logServerError(error);
    });
  }
}
