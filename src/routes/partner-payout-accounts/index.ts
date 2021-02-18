import Router from "koa-router";
import uuid from "node-uuid";
import db from "../../services/db";

import * as PartnerPayoutAccounts from "../../dao/partner-payout-accounts";
import canAccessUserResource = require("../../middleware/can-access-user-resource");
import requireAuth = require("../../middleware/require-auth");
import requireAdmin = require("../../middleware/require-admin");
import {
  createConnectAccount,
  createLoginLink,
  getBalances,
} from "../../services/stripe";

const router = new Router();

function* getAccounts(this: AuthedContext) {
  const { userId, teamId } = this.query;

  this.assert(userId || teamId, 400, "User ID of Team ID must be provided");
  if (userId) {
    canAccessUserResource.call(this, userId);
    const accounts = yield PartnerPayoutAccounts.findByUserId(userId);
    this.body = accounts;
  } else {
    if (this.state.role !== "ADMIN") {
      this.throw(403, "Must be an admin to view team payout accounts");
    }
    const accounts = yield PartnerPayoutAccounts.findByTeamId(db, teamId);
    this.body = accounts;
  }
  this.status = 200;
}

function* postCreateLoginLink(this: AuthedContext) {
  const { accountId } = this.params;
  const account = yield PartnerPayoutAccounts.findById(accountId);
  this.assert(account, 404, "Partner account not found");
  canAccessUserResource.call(this, account.userId);

  const url = yield createLoginLink(account.stripeUserId);

  this.body = { url };
  this.status = 201;
}

function* createAccount(this: AuthedContext) {
  const { stripeAuthorizationCode } = this.request.body as any;
  this.assert(
    stripeAuthorizationCode,
    400,
    "Missing Stripe authorization code"
  );

  const connectAccount = yield createConnectAccount(stripeAuthorizationCode);

  const account = yield PartnerPayoutAccounts.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    userId: this.state.userId,
    stripeAccessToken: connectAccount.access_token,
    stripeRefreshToken: connectAccount.refresh_token,
    stripePublishableKey: connectAccount.stripe_publishable_key,
    stripeUserId: connectAccount.stripe_user_id,
  });

  this.body = account;
  this.status = 200;
}

function* getPayoutBalances(this: AuthedContext) {
  const balances = yield getBalances();

  this.body = {
    stripe: balances,
  };
  this.status = 200;
}

router.get("/", requireAuth, getAccounts);
router.post("/:accountId/login-link", requireAuth, postCreateLoginLink);
router.post("/", requireAuth, createAccount);
router.get("/balances", requireAuth, requireAdmin, getPayoutBalances);

export = router.routes();
