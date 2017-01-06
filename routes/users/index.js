'use strict';

const router = require('koa-router')({
  prefix: '/users'
});

const AddressesDAO = require('../../dao/addresses');
const InvalidDataError = require('../../errors/invalid-data');
const MailChimp = require('../../services/mailchimp');
const requireAuth = require('../../middleware/require-auth');
const Shopify = require('../../services/shopify');
const UsersDAO = require('../../dao/users');
const { MAILCHIMP_LIST_ID_USERS } = require('../../services/config');

/**
 * POST /users
 */
function* createUser() {
  const {
    name,
    zip,
    email,
    password,
    address
  } = this.request.body;

  const user = yield UsersDAO.create({ name, zip, email, password })
    .catch(InvalidDataError, err => this.throw(400, err));

  // This is super naive and doesn't use transactions; if the address creation
  // fails, the user will still be created. TODO clean up.
  if (address) {
    const addressData = Object.assign({}, address, {
      userId: user.id
    });

    const addressInstance = yield AddressesDAO.create(addressData)
      .catch(InvalidDataError, err => this.throw(400, err));

    user.setAddresses([addressInstance]);
  }

  yield MailChimp.subscribe({
    email,
    name,
    referralCode: user.referralCode,
    zip,
    listId: MAILCHIMP_LIST_ID_USERS
  });

  this.status = 201;
  this.body = user;
}

/**
 * PUT /users/:userId/password
 * @param {String} password
 */
function* updatePassword() {
  this.assert(this.params.userId === this.state.userId, 403, 'You can only update your own user');

  const { password } = this.request.body;
  this.assert(password, 400, 'A new password must be provided');

  yield UsersDAO.updatePassword(this.params.userId, password);

  this.status = 200;
  this.body = { ok: true };
}

/**
 * GET /users/:userId/referral-count
 *
 * Find out how many other users I've referred.
 */
function* getReferralCount() {
  this.assert(this.params.userId === this.state.userId, 403, 'You can only get referral count for your own user');

  const user = yield UsersDAO.findById(this.params.userId);
  const count = yield Shopify.getRedemptionCount(user.referralCode);
  this.status = 200;
  this.body = { count };
}

/**
 * GET /users?referralCode=12312
 *
 * Returns an array to future-proof in case we want to list multiple users in
 * future.
 */
function* getByReferralCode() {
  this.assert(this.query.referralCode, 400, 'A referral code must be provided to filter on');
  const user = yield UsersDAO.findByReferralCode(this.query.referralCode);
  this.body = [user].filter(Boolean);
  this.status = 200;
}

router.get('/', getByReferralCode);
router.get('/:userId/referral-count', requireAuth, getReferralCount);
router.post('/', createUser);
router.put('/:userId/password', requireAuth, updatePassword);

module.exports = router.routes();
