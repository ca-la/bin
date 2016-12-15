'use strict';

const router = require('koa-router')({
  prefix: '/referral-codes'
});

const UsersDAO = require('../../dao/users');
const Shopify = require('../../services/shopify');

/**
 * GET /referral-codes/:id
 *
 * Retrieve the details about a specific referral code
 */
function* getById() {
  const user = yield UsersDAO.getByReferralCode(this.params.referralCode);
  this.body = user;
  this.status = 200;
}

/**
 * GET /referral-codes/:id/redemption-count
 *
 * Find out the number of times that a given referral code has been redeemed
 */
function* getRedemptionCount() {
  const count = yield Shopify.getRedemptionCount(this.params.referralCode);
  this.body = { count };
  this.status = 200;
}

router.get('/:referralCode', getById);
router.get('/:referralCode/redemption-count', getRedemptionCount);

module.exports = router.routes();
