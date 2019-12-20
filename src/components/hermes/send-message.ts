import { HermesMessage } from '@cala/ts-lib';
import { PromiseResult } from 'aws-sdk/lib/request';
import { AWSError, SQS } from 'aws-sdk';
import { enqueueMessage } from '../../services/aws/sqs';
import { AWS_HERMES_SQS_REGION, AWS_HERMES_SQS_URL } from '../../config';

export function sendMessage(
  resource: HermesMessage
): Promise<PromiseResult<SQS.SendMessageResult, AWSError>> {
  return enqueueMessage({
    deduplicationId: `${resource.type}-${resource.designId}`,
    messageGroupId: resource.type,
    messageType: 'hermes-message',
    payload: resource,
    queueRegion: AWS_HERMES_SQS_REGION,
    queueUrl: AWS_HERMES_SQS_URL
  });
}
