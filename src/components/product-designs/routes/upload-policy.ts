import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import {
  AWS_USER_UPLOADS_BUCKET_NAME as BUCKET_NAME,
  AWS_USER_UPLOADS_BUCKET_REGION as BUCKET_REGION
} from '../../../config';
import { generateUploadPolicy } from '../../../services/upload-policy';

function* getDesignUploadPolicy(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { mimeType } = this.query;

  if (!mimeType) {
    return this.throw(
      400,
      'A mimeType must be specified in the query parameters!'
    );
  }

  const uploadPolicy = generateUploadPolicy({
    id: this.params.id || uuid.v4(),
    mimeType,
    s3Bucket: BUCKET_NAME,
    s3Region: BUCKET_REGION
  });

  this.body = uploadPolicy;
  this.status = 200;
}

module.exports = {
  getDesignUploadPolicy
};
