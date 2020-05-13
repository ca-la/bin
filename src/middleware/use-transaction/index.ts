import Koa from 'koa';

import db from '../../services/db';

export default function* useTransaction(
  this: Koa.Context,
  next: () => Promise<any>
): Iterator<any, any, any> {
  if (this.state.trx) {
    this.throw('Transaction already created');
  }
  const trx = yield db.transaction();
  try {
    this.state.trx = trx;
    yield next;
    yield trx.commit();
  } catch (err) {
    trx.rollback();
    throw err;
  }
}
