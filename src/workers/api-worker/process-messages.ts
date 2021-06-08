import { fetchResources, deleteResources } from "./aws";
import { log, logServerError } from "../../services/logger";
import { MessageHandler } from "./message-handler";
import { HandlerResult } from "./types";

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

  let handlerResult: HandlerResult;
  try {
    handlerResult = await handler(message);
  } catch (e) {
    handlerResult = {
      type: "FAILURE",
      error: e,
    };
  }

  if (
    handlerResult.type === "FAILURE" ||
    handlerResult.type === "FAILURE_DO_NOT_RETRY"
  ) {
    const retryMessage =
      handlerResult.type === "FAILURE_DO_NOT_RETRY"
        ? "(we won't retry this message)"
        : "(we will retry this message)";
    logServerError(
      `Message handler error ${retryMessage}: `,
      handlerResult.error
    );
  }

  if (handlerResult.type === "SUCCESS" && handlerResult.message !== null) {
    log(handlerResult.message);
  }

  if (!message.ReceiptHandle) {
    logServerError(
      `Message ${message.MessageId} does not contain a ReceiptHandle!`
    );
    return;
  }

  if (handlerResult.type === "FAILURE") {
    // we don't delete the resource for the message we want to try again later
    // SQS will allows us to receive it again after it becomes visible (VisibilityTimeout 30s).
    // https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
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
