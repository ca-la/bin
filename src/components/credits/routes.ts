import * as Router from 'koa-router';
import * as Koa from 'koa';

import { getCreditAmount } from './dao';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

interface GetCreditQuery {
  userId?: string;
}

interface GetCreditResponse {
  creditAmountCents: number;
}

function* getCredits(
  this: Koa.Application.Context
): AsyncIterableIterator<GetCreditResponse> {
  const { userId }: GetCreditQuery = this.query;

  if (!userId) {
    return this.throw(400, 'Missing user ID');
  }

  const creditAmountCents = yield getCreditAmount(userId);

  this.status = 200;
  this.body = { creditAmountCents };
}

router.get('/', requireAuth, getCredits);

export default router.routes();
