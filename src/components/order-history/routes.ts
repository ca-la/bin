import Router from 'koa-router';

import requireAuth = require('../../middleware/require-auth');
import { getOrderHistory } from './services/get-order-history';

const router = new Router();

function* retrieveOrderHistory(this: AuthedContext): Iterator<any, any, any> {
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
    this.throw(400, 'Must specify a query param "type" of "designs"');
  }
}

router.get('/', requireAuth, retrieveOrderHistory);

export default router.routes();
