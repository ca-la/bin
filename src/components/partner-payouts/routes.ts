import Router from "koa-router";
import db from "../../services/db";

import canAccessUserResource = require("../../middleware/can-access-user-resource");
import PartnerPayoutAccounts = require("../../dao/partner-payout-accounts");
import requireAuth = require("../../middleware/require-auth");

import * as PartnerPayoutLogs from "./dao";

const router = new Router();

function* getLogs(this: AuthedContext): Iterator<any, any, any> {
  const { userId, role } = this.state;
  const { payoutAccountId, bidId } = this.query;

  if (payoutAccountId) {
    const account = yield PartnerPayoutAccounts.findById(payoutAccountId, db);
    this.assert(account, 400, "Invalid account ID");
    canAccessUserResource.call(this, account.userId);

    const logs = yield PartnerPayoutLogs.findByPayoutAccountId(
      db,
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
    this.body = yield PartnerPayoutLogs.findByBidId(db, bidId);
    this.status = 200;
  } else {
    const logs = yield PartnerPayoutLogs.findByUserId(db, userId);
    this.status = 200;
    this.body = logs;
  }
}

router.get("/", requireAuth, getLogs);

export default router.routes();
