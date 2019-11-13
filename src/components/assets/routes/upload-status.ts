import * as Koa from 'koa';

import * as AssetsDAO from '../dao';
import { hasOnlyProperties } from '../../../services/require-properties';
import { Serialized } from '../../../types/serialized';

interface UploadStatus {
  uploadCompletedAt: Date;
}

function isUploadBody(data: object): data is Serialized<UploadStatus> {
  return hasOnlyProperties(data, 'uploadCompletedAt');
}

export function* uploadStatus(
  this: Koa.Application.Context
): Iterator<any, any, any> {
  const { body } = this.request;
  const { assetId } = this.params;

  if (!isUploadBody(body)) {
    return this.throw(400, 'Body must contain an uploadCompletedAt date!');
  }

  const asset = yield AssetsDAO.update(assetId, {
    uploadCompletedAt: new Date(body.uploadCompletedAt)
  });
  this.status = 200;
  this.body = asset;
}
