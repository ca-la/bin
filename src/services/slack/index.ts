import { PromiseResult } from 'aws-sdk/lib/request';
import { SendMessageResult } from 'aws-sdk/clients/sqs';

import { enqueueMessage } from '../aws/sqs';
import { requireProperties } from '../require-properties';
import {
  AWS_NOTIFICATION_SQS_REGION,
  AWS_NOTIFICATION_SQS_URL
} from '../../config';

type TemplateName = 'collection_submission'
  | 'designer_pay_later'
  | 'designer_payment'
  | 'partner_accept_bid'
  | 'partner_reject_bid';

export interface SlackBody {
  channel: string;
  templateName: TemplateName;
  params: object;
}

export function enqueueSend(
  data: SlackBody
): Promise<PromiseResult<SendMessageResult, AWS.AWSError>> {
  requireProperties(data, 'channel', 'templateName', 'params');

  return enqueueMessage({
    messageType: 'slack',
    payload: data,
    queueRegion: AWS_NOTIFICATION_SQS_REGION,
    queueUrl: AWS_NOTIFICATION_SQS_URL
  });
}

module.exports = {
  enqueueSend
};
