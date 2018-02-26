'use strict';

const Router = require('koa-router');

const canAccessUserResource = require('../../middleware/can-access-user-resource');
const PartnerPayoutAccounts = require('../../dao/partner-payout-accounts');
const PartnerPayoutLogs = require('../../dao/partner-payout-logs');
const requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* getLogs() {
  const { payoutAccountId } = this.query;
  this.assert(payoutAccountId, 400, 'Account ID must be provided');

  const account = yield PartnerPayoutAccounts.findById(payoutAccountId);
  this.assert(account, 400, 'Invalid account ID');

  canAccessUserResource.call(this, account.userId);

  const logs = yield PartnerPayoutLogs.findByPayoutAccountId(payoutAccountId);

  this.status = 200;
  this.body = logs;
}

router.get('/', requireAuth, getLogs);

module.exports = router.routes();
