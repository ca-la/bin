import AWS from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";
import { SendMessageResult } from "aws-sdk/clients/sqs";

interface SQSRequest {
  deduplicationId?: string;
  queueUrl: string;
  queueRegion: string;
  messageType: string;
  payload: any;
  messageGroupId?: string;
}

export async function enqueueMessage(
  request: SQSRequest
): Promise<PromiseResult<SendMessageResult, AWS.AWSError>> {
  const sqs = new AWS.SQS({ region: request.queueRegion });
  const params: AWS.SQS.SendMessageRequest = {
    MessageAttributes: {
      type: {
        DataType: "String",
        StringValue: request.messageType,
      },
    },
    MessageBody: JSON.stringify(request.payload),
    MessageDeduplicationId: request.deduplicationId,
    MessageGroupId: request.messageGroupId,
    QueueUrl: request.queueUrl,
  };
  return sqs.sendMessage(params).promise();
}
