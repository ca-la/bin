import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import {
  AWS_S3_THUMBNAIL_BUCKET_NAME,
  AWS_USER_UPLOADS_BUCKET_NAME as BUCKET_NAME,
  AWS_USER_UPLOADS_BUCKET_REGION as BUCKET_REGION
} from '../../../config';
import * as AWSService from '../../../services/aws';
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

function* getThumbnailUploadPolicy(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const remoteFileName = this.params.sectionId || uuid.v4();
  const { url, fields } = yield AWSService.getThumbnailUploadPolicy(
    AWS_S3_THUMBNAIL_BUCKET_NAME,
    remoteFileName
  );

  this.body = {
    downloadUrl: `https://${AWS_S3_THUMBNAIL_BUCKET_NAME}.s3.amazonaws.com/${remoteFileName}`,
    formData: fields,
    remoteFileName,
    uploadUrl: url
  };
  this.status = 200;
}

module.exports = {
  getDesignUploadPolicy,
  getThumbnailUploadPolicy
};
