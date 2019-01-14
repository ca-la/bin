import { PromiseResult } from 'aws-sdk/lib/request';
import { SendMessageResult } from 'aws-sdk/clients/sqs';

import { enqueueMessage } from '../aws';
import { requireProperties } from '../require-properties';
import {
  AWS_NOTIFICATION_SQS_REGION,
  AWS_NOTIFICATION_SQS_URL
} from '../../config';

type TemplateName =  'collection_submission' | 'designer_pay_later' | 'designer_payment';

export interface SlackBody {
  channel: string;
  templateName: TemplateName;
  params: object;
}

export function enqueueSend(
  data: SlackBody
): Promise<PromiseResult<SendMessageResult, AWS.AWSError>> {
  requireProperties(data, 'channel', 'templateName', 'params');

  return enqueueMessage(
    AWS_NOTIFICATION_SQS_URL,
    AWS_NOTIFICATION_SQS_REGION,
    'slack',
    data
  );
}

module.exports = {
  enqueueSend
};
