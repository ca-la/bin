import * as tape from 'tape';
import * as sinon from 'sinon';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';

import * as AWSService from './index';
import { sandbox, test } from '../../test-helpers/fresh';

test('AWS Service supports uploading a file', async (t: tape.Test) => {
  const awsStub = sandbox()
    .stub(AWS, 'S3')
    .returns({
      putObject: (): object => {
        return {
          promise: (): object => {
            return { $response: { data: null, error: null } };
          }
        };
      }
    });
  const fsStub = sandbox()
    .stub(fs, 'readFileSync')
    .returns({});

  const result = await AWSService.uploadFile(
    'foo',
    'remote-bar.jpg',
    'bar.jpg',
    'image/jpeg'
  );
  t.deepEqual(result, 'https://foo.s3.amazonaws.com/remote-bar.jpg');
  sinon.assert.callCount(awsStub, 1);
  sinon.assert.callCount(fsStub, 1);
});

test('AWS Service supports deleting a file', async (t: tape.Test) => {
  const awsStub = sandbox()
    .stub(AWS, 'S3')
    .returns({
      deleteObject: (): object => {
        return {
          promise: (): void => {
            /* NO-OP */
          }
        };
      }
    });

  await AWSService.deleteFile('foo', 'remote-bar.jpg');
  sinon.assert.callCount(awsStub, 1);
  t.ok('Deletion is executed on the AWS instance');
});

test('AWS Service supports getting a file', async (t: tape.Test) => {
  const awsStub = sandbox()
    .stub(AWS, 'S3')
    .returns({
      getObject: (): object => {
        return {
          promise: (): void => {
            /* NO-OP */
          }
        };
      }
    });

  await AWSService.getFile('foo', 'remote-bar.jpg');
  sinon.assert.callCount(awsStub, 1);
  t.ok('Get statement is executed on the AWS instance');
});

test('AWS Service supports getting a download url', async (t: tape.Test) => {
  const awsStub = sandbox()
    .stub(AWS, 'S3')
    .returns({
      getObject: (): object => {
        return {
          promise: (): object => {
            return {
              ContentType: 'image/jpg'
            };
          }
        };
      },
      getSignedUrl: (): object => {
        return {
          promise: (): void => {
            /* NO-OP */
          }
        };
      }
    });

  await AWSService.getDownloadUrl('foo', 'remote-bar.jpg');
  sinon.assert.callCount(awsStub, 2);
  t.ok('Get statement is executed on the AWS instance');
});

test('AWS Service supports getting an upload policy', async (t: tape.Test) => {
  const awsStub = sandbox()
    .stub(AWS, 'S3')
    .returns({
      createPresignedPost: (): void => {
        /* NO-OP */
      }
    });

  AWSService.getUploadPolicy(
    'foo',
    'us-east-2',
    'bar.jpg',
    'attachment; filename="bar.jpg"',
    'image/jpeg'
  );
  sinon.assert.callCount(awsStub, 1);
  t.ok('Presigned post statement is executed on the AWS instance');
});

test('AWS Service supports getting a thumbnail upload policy', async (t: tape.Test) => {
  const awsStub = sandbox()
    .stub(AWS, 'S3')
    .returns({
      createPresignedPost: (): void => {
        /* NO-OP */
      }
    });

  AWSService.getThumbnailUploadPolicy('foo', 'bar.jpg');
  sinon.assert.callCount(awsStub, 1);
  t.ok('Presigned post statement is executed on the AWS instance');
});
