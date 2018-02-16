'use strict';

const Router = require('koa-router');

const canAccessUserResource = require('../../middleware/can-access-user-resource');
const PartnerPayoutAccounts = require('../../dao/partner-payout-accounts');
const requireAuth = require('../../middleware/require-auth');
const Stripe = require('../../services/stripe');

const router = new Router();

function* getAccounts() {
  const { userId } = this.query;
  this.assert(userId, 400, 'User ID must be provided');
  canAccessUserResource.call(this, userId);

  const accounts = yield PartnerPayoutAccounts.findByUserId(userId);

  this.status = 200;
  this.body = accounts;
}

function* createLoginLink() {
  const { accountId } = this.params;
  const account = yield PartnerPayoutAccounts.findById(accountId);
  this.assert(account, 404, 'Partner account not found');
  canAccessUserResource.call(this, account.userId);

  const url = yield Stripe.createLoginLink({ accountId: account.stripeUserId });

  this.body = { url };
  this.status = 201;
}

function* createAccount() {
  const { stripeAuthorizationCode } = this.request.body;
  this.assert(stripeAuthorizationCode, 400, 'Missing Stripe authorization code');

  const connectAccount = yield Stripe.createConnectAccount(stripeAuthorizationCode);

  const account = yield PartnerPayoutAccounts.create({
    userId: this.state.userId,
    stripeAccessToken: connectAccount.access_token,
    stripeRefreshToken: connectAccount.refresh_token,
    stripePublishableKey: connectAccount.stripe_publishable_key,
    stripeUserId: connectAccount.stripe_user_id
  });

  this.body = account;
  this.status = 200;
}

router.get('/', requireAuth, getAccounts);
router.post('/:accountId/login-link', requireAuth, createLoginLink);
router.post('/', requireAuth, createAccount);

module.exports = router.routes();
