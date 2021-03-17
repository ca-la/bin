import { enqueueMessage } from "../aws/sqs";
import { requireProperties } from "../require-properties";
import {
  AWS_NOTIFICATION_SQS_URL,
  AWS_NOTIFICATION_SQS_REGION,
} from "../../config";

interface Params {
  [key: string]: any;
}

export function enqueueSend(data: Params) {
  requireProperties(data, "to", "templateName", "params");

  return enqueueMessage({
    queueUrl: AWS_NOTIFICATION_SQS_URL,
    queueRegion: AWS_NOTIFICATION_SQS_REGION,
    messageType: "email",
    payload: data,
  });
}
