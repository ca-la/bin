import * as Koa from 'koa';

import ProductDesignImage = require('../domain-object');
import ProductDesignImagesDAO = require('../dao');
import { hasOnlyProperties } from '../../../services/require-properties';

interface UploadStatus {
  uploadCompletedAt: Date;
}

function isUploadBody(data: object): data is UploadStatus {
  return hasOnlyProperties(
    data,
    'uploadCompletedAt'
  );
}

export function* uploadStatus(
  this: Koa.Application.Context
): AsyncIterableIterator<ProductDesignImage> {
  const { body } = this.request;
  const { imageId } = this.params;

  if (!isUploadBody(body)) {
    return this.throw(400, 'Body must contain an uploadCompletedAt date!');
  }

  const image = yield ProductDesignImagesDAO.update(imageId, {
    uploadCompletedAt: body.uploadCompletedAt
  });
  this.status = 200;
  this.body = image;
}

module.exports = uploadStatus;
