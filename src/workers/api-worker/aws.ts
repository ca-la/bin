import AWS from "aws-sdk";
import {
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  AWS_API_WORKER_SQS_REGION,
  AWS_API_WORKER_SQS_URL,
} from "../../config";
import { logServerError } from "../../services/logger";

/**
 * Updates the global configuration for AWS.
 */
export function configureAWS(): void {
  AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  });
}

export type SQSMessage = AWS.SQS.Message;
interface SQSResponse {
  Messages?: SQSMessage[];
}

/**
 * Reads a message from the SQS queue. Waits for up to 20 seconds for a message to come in.
 */
export async function readMessage(): Promise<SQSMessage | null> {
  const sqs = new AWS.SQS({ region: AWS_API_WORKER_SQS_REGION });
  const res: SQSResponse = await sqs
    .receiveMessage({
      MaxNumberOfMessages: 1,
      MessageAttributeNames: ["All"],
      QueueUrl: AWS_API_WORKER_SQS_URL,
      WaitTimeSeconds: 20,
    })
    .promise();

  if (!res.Messages || res.Messages.length === 0) {
    return null;
  }

  if (res.Messages.length > 1) {
    logServerError(res.Messages);
    throw new Error(`Expected 1 message, received: ${res.Messages.length}`);
  }

  return res.Messages[0];
}

/**
 * Fetches an SQS resource.
 */
export async function fetchResources(): Promise<{
  message: SQSMessage | null;
}> {
  const message: SQSMessage | null = await readMessage();

  return {
    message,
  };
}

/**
 * Deletes a message from the SQS queue.
 */
export async function deleteMessage(receiptHandle: string): Promise<void> {
  const sqs = new AWS.SQS({ region: AWS_API_WORKER_SQS_REGION });
  await sqs
    .deleteMessage({
      QueueUrl: AWS_API_WORKER_SQS_URL,
      ReceiptHandle: receiptHandle,
    })
    .promise();
}

/**
 * Deletes a message from SQS.
 */
export async function deleteResources(sqsReceiptHandle: string): Promise<void> {
  await deleteMessage(sqsReceiptHandle);
}
