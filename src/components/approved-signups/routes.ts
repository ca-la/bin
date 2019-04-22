import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as uuid from 'node-uuid';

import InvalidDataError = require('../../errors/invalid-data');
import filterError = require('../../services/filter-error');
import requireAdmin = require('../../middleware/require-admin');
import { ApprovedSignup } from './domain-object';
import { create } from './dao';
import { hasProperties } from '../../services/require-properties';

const router = new Router();

function isUnsavedApprovedSignup(data: object): data is Unsaved<ApprovedSignup> {
  return hasProperties(
    data,
    'email',
    'firstName',
    'lastName'
  );
}

function* createApproval(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { body } = this.request;

  if (body && isUnsavedApprovedSignup(body)) {
    const approval = yield create({
      createdAt: new Date(),
      id: uuid.v4(),
      ...body
    }).catch(
      filterError(InvalidDataError, (err: Error) => this.throw(400, err))
    );
    this.status = 201;
    this.body = approval;
  } else {
    this.throw(400, 'Request does not match the Approved Signup properties.');
  }
}

router.post('/', requireAdmin, createApproval);

export default router.routes();
