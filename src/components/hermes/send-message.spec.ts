import tape from 'tape';

import { sandbox, test } from '../../test-helpers/fresh';
import Configuration from '../../config';
import { sendMessage } from './send-message';
import { HermesMessage, HermesMessageType } from '@cala/ts-lib';
import * as SQSService from '../../services/aws/sqs';

test('sendMessage supports sending a message', async (t: tape.Test) => {
  sandbox()
    .stub(Configuration, 'AWS_HERMES_SQS_URL')
    .value('HERMES-sqs-url');
  sandbox()
    .stub(Configuration, 'AWS_HERMES_SQS_REGION')
    .value('HERMES-sqs-region');

  const sqsStub = sandbox()
    .stub(SQSService, 'enqueueMessage')
    .resolves({});

  const hermesMessage: HermesMessage = {
    type: HermesMessageType.SHOPIFY_PRODUCT_CREATE,
    storefrontId: 'storeId-123',
    designId: 'designId-456'
  };

  await sendMessage(hermesMessage);

  t.deepEqual(sqsStub.args[0][0], {
    deduplicationId: 'shopify/product-create-designId-456',
    messageGroupId: 'shopify/product-create',
    messageType: 'hermes-message',
    payload: {
      type: HermesMessageType.SHOPIFY_PRODUCT_CREATE,
      storefrontId: 'storeId-123',
      designId: 'designId-456'
    },
    queueRegion: 'HERMES-sqs-region',
    queueUrl: 'HERMES-sqs-url'
  });
});
