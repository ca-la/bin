import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import {
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_NAME as BUCKET_NAME,
  AWS_PRODUCT_DESIGN_IMAGE_BUCKET_REGION as BUCKET_REGION,
  AWS_S3_THUMBNAIL_BUCKET_NAME
} from '../../config';
import * as AWSService from '../../services/aws';
import { generateFilename } from '../../services/generate-filename';

function* getDesignUploadPolicy(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { mimeType } = this.query;

  if (!mimeType) {
    return this.throw(400, 'A mimeType must be specified in the query parameters!');
  }

  const remoteFileName = this.params.id || uuid.v4();
  const filenameWithExtension = generateFilename(remoteFileName, mimeType);
  const contentDisposition = `attachment; filename="${filenameWithExtension}"`;
  const contentType = mimeType;
  const { url, fields } = yield AWSService.getUploadPolicy(
    BUCKET_NAME,
    BUCKET_REGION,
    remoteFileName,
    contentDisposition,
    contentType
  );

  this.body = {
    contentDisposition,
    contentType,
    downloadUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${remoteFileName}`,
    formData: fields,
    remoteFileName,
    uploadUrl: url
  };
  this.status = 200;
}

function* getThumbnailUploadPolicy(this: Koa.Application.Context): AsyncIterableIterator<any> {
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
