import Router from "koa-router";
import db from "../../services/db";
import convert from "koa-convert";

import canAccessUserResource = require("../../middleware/can-access-user-resource");
import PartnerPayoutAccounts = require("../../dao/partner-payout-accounts");
import requireAuth = require("../../middleware/require-auth");
import { StrictContext } from "../../router-context";
import useTransaction, {
  TransactionState,
} from "../../middleware/use-transaction";
import filterError = require("../../services/filter-error");
import ResourceNotFoundError from "../../errors/resource-not-found";
import requireAdmin = require("../../middleware/require-admin");

import * as PartnerPayoutLogs from "./dao";
import { PartnerPayoutLog, PartnerPayoutLogDb } from "./types";

const router = new Router();

interface GetLogsContext
  extends StrictContext<(PartnerPayoutLog | PartnerPayoutLogDb)[]> {
  state: AuthedState;
  query: { payoutAccountId?: string; bidId?: string };
}

async function getLogs(ctx: GetLogsContext) {
  const { userId, role } = ctx.state;
  const { payoutAccountId, bidId } = ctx.query;

  if (payoutAccountId) {
    const account = await PartnerPayoutAccounts.findById(payoutAccountId, db);
    ctx.assert(account, 400, "Invalid account ID");
    canAccessUserResource.call(ctx, account.userId);

    const logs = await PartnerPayoutLogs.findByPayoutAccountId(
      db,
      payoutAccountId
    );
    ctx.status = 200;
    ctx.body = logs;
  } else if (bidId) {
    ctx.assert(
      role === "ADMIN",
      403,
      "Only an admin may fetch payout logs for a bid"
    );
    ctx.body = await PartnerPayoutLogs.findByBidId(db, bidId);
    ctx.status = 200;
  } else {
    const logs = await PartnerPayoutLogs.findByUserId(db, userId);
    ctx.status = 200;
    ctx.body = logs;
  }
}

interface DeleteContext extends StrictContext {
  state: TransactionState;
  params: { logId: string };
}

async function deleteLogById(ctx: DeleteContext) {
  const { trx } = ctx.state;
  const { logId } = ctx.params;

  await PartnerPayoutLogs.deleteById(trx, logId).catch(
    filterError(ResourceNotFoundError, (err: ResourceNotFoundError) => {
      ctx.throw(404, err.message);
    })
  );

  ctx.status = 204;
}

router.get("/", requireAuth, convert.back(getLogs));
router.del(
  "/:logId",
  requireAuth,
  requireAdmin,
  useTransaction,
  convert.back(deleteLogById)
);

export default router.routes();
