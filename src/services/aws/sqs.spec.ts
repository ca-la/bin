import * as tape from 'tape';
import * as sinon from 'sinon';
import * as AWS from 'aws-sdk';

import * as SQSService from './sqs';
import { sandbox, test } from '../../test-helpers/fresh';

test('AWS Service supports enqueuing a message', async (t: tape.Test) => {
  const awsStub = sandbox()
    .stub(AWS, 'SQS')
    .returns({
      sendMessage: (): object => {
        return {
          promise: (): void => {
            /* NO-OP */
          }
        };
      }
    });

  await SQSService.enqueueMessage({
    messageType: 'foo-bar',
    payload: 'foo',
    queueRegion: 'us-east-2',
    queueUrl: 'foo-bar.biz'
  });
  sinon.assert.callCount(awsStub, 1);
  t.ok('Presigned post statement is executed on the AWS instance');
});
