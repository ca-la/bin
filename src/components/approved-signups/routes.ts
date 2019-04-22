import * as Router from 'koa-router';
import * as Koa from 'koa';

import InvalidDataError = require('../../errors/invalid-data');
import filterError = require('../../services/filter-error');
import requireAdmin = require('../../middleware/require-admin');
import { isApprovedSignup } from './domain-object';
import { create } from './dao';

const router = new Router();

function* createApproval(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { body } = this.request;

  if (body && isApprovedSignup(body)) {
    const approval = yield create(body).catch(
      filterError(InvalidDataError, (err: Error) => this.throw(400, err))
    );
    this.status = 201;
    this.body = approval;
  } else {
    this.throw(400, 'Request does not match the Approved Signup properties.');
  }
}

router.put('/:signupId', requireAdmin, createApproval);

export default router.routes();
