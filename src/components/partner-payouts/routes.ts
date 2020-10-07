import Router from "koa-router";

import canAccessUserResource = require("../../middleware/can-access-user-resource");
import PartnerPayoutAccounts = require("../../dao/partner-payout-accounts");
import requireAuth = require("../../middleware/require-auth");
import useTransaction from "../../middleware/use-transaction";

import * as PartnerPayoutLogs from "./dao";

const router = new Router();

function* getLogs(this: TrxContext<AuthedContext>): Iterator<any, any, any> {
  const { trx, userId, role } = this.state;
  const { payoutAccountId, bidId } = this.query;

  if (payoutAccountId) {
    const account = yield PartnerPayoutAccounts.findById(payoutAccountId, trx);
    this.assert(account, 400, "Invalid account ID");
    canAccessUserResource.call(this, account.userId);

    const logs = yield PartnerPayoutLogs.findByPayoutAccountId(
      trx,
      payoutAccountId
    );
    this.status = 200;
    this.body = logs;
  } else if (bidId) {
    this.assert(
      role === "ADMIN",
      403,
      "Only an admin may fetch payout logs for a bid"
    );
    this.body = yield PartnerPayoutLogs.findByBidId(trx, bidId);
    this.status = 200;
  } else {
    const logs = yield PartnerPayoutLogs.findByUserId(trx, userId);
    this.status = 200;
    this.body = logs;
  }
}

router.get("/", requireAuth, useTransaction, getLogs);

export default router.routes();
