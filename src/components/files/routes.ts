import * as Router from 'koa-router';
import * as Koa from 'koa';

import { isFileData, isPartialFileData } from './domain-object';
import * as FilesDAO from './dao';
import { generateUploadPolicy } from '../../services/upload-policy';
import {
  AWS_FILES_BUCKET_NAME as BUCKET_NAME,
  AWS_FILES_BUCKET_REGION as BUCKET_REGION
} from '../../config';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* findById(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { fileId } = this.params;

  if (fileId) {
    const file = yield FilesDAO.findById(fileId);

    if (!file) {
      return this.throw(404, `File ${fileId} not found.`);
    }

    this.status = 200;
    this.body = file;
  } else {
    this.throw(400, 'A file id was not provided.');
  }
}

function* create(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { body } = this.request;

  if (body && isFileData(body)) {
    const file = yield FilesDAO.create(body);
    this.status = 201;
    this.body = file;
  } else {
    this.throw(400, 'Cannot create a file with the supplied object.');
  }
}

function* update(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { body } = this.request;
  const { fileId } = this.params;

  if (fileId && body && isPartialFileData(body)) {
    const file = yield FilesDAO.update(fileId, body);
    this.status = 200;
    this.body = file;
  } else {
    this.throw(400, 'Cannot update a file with the supplied values.');
  }
}

function* getUploadPolicy(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { mimeType } = this.query;
  const { fileId } = this.params;

  if (!mimeType || !fileId) {
    return this.throw(400, 'A mimeType and a fileId are required.');
  }

  const uploadPolicy = generateUploadPolicy({
    id: this.params.fileId,
    mimeType,
    s3Bucket: BUCKET_NAME,
    s3Region: BUCKET_REGION
  });

  this.body = uploadPolicy;
  this.status = 200;
}

router.get('/:fileId', requireAuth, findById);
router.put('/:fileId', requireAuth, create);
router.patch('/:fileId', requireAuth, update);
router.get('/:fileId/upload-policy', requireAuth, getUploadPolicy);

export default router.routes();
