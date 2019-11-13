import * as Router from 'koa-router';
import * as Koa from 'koa';

import requireAuth = require('../../middleware/require-auth');
import { getOrderHistory } from './services/get-order-history';

const router = new Router();

function* retrieveOrderHistory(
  this: Koa.Application.Context
): IterableIterator<any> {
  const { userId } = this.state;
  const { limit, offset, type } = this.query;

  if (type === 'designs') {
    const orders = yield getOrderHistory({
      limit: Number(limit),
      offset: Number(offset),
      userId
    });
    this.body = orders;
    this.status = 200;
  } else {
    return this.throw(400, 'Must specify a query param "type" of "designs"');
  }
}

router.get('/', requireAuth, retrieveOrderHistory);

export default router.routes();
