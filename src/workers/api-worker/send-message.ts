import { PromiseResult } from "aws-sdk/lib/request";
import { AWSError, SQS } from "aws-sdk";
import { enqueueMessage } from "../../services/aws/sqs";
import {
  AWS_API_WORKER_SQS_REGION,
  AWS_API_WORKER_SQS_URL,
} from "../../config";
import { ApiMessages, Task } from "./types";

export function sendMessage<MessageKey extends keyof ApiMessages>(
  resource: Task<MessageKey>
): Promise<PromiseResult<SQS.SendMessageResult, AWSError>> {
  return enqueueMessage({
    deduplicationId: `${resource.type}-${resource.deduplicationId}`,
    messageGroupId: resource.type,
    messageType: "api-worker-message",
    payload: resource,
    queueRegion: AWS_API_WORKER_SQS_REGION,
    queueUrl: AWS_API_WORKER_SQS_URL,
  });
}
