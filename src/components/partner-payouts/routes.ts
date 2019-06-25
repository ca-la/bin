import * as Router from 'koa-router';
import * as Koa from 'koa';

import canAccessUserResource = require('../../middleware/can-access-user-resource');
import PartnerPayoutAccounts = require('../../dao/partner-payout-accounts');
import * as PartnerPayoutLogs from './dao';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* getLogs(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const { userId } = this.state;
  const { payoutAccountId } = this.query;

  if (payoutAccountId) {
    const account = yield PartnerPayoutAccounts.findById(payoutAccountId);
    this.assert(account, 400, 'Invalid account ID');
    canAccessUserResource.call(this, account.userId);

    const logs = yield PartnerPayoutLogs.findByPayoutAccountId(payoutAccountId);
    this.status = 200;
    this.body = logs;
  } else {
    const logs = PartnerPayoutLogs.findByUserId(userId);
    this.status = 200;
    this.body = logs;
  }
}

router.get('/', requireAuth, getLogs);

export default router.routes();
