'use strict';

const Router = require('koa-router');

const AddressesDAO = require('../../dao/addresses');
const attachRole = require('../../middleware/attach-role');
const InvalidDataError = require('../../errors/invalid-data');
const MailChimp = require('../../services/mailchimp');
const requireAuth = require('../../middleware/require-auth');
const ScansDAO = require('../../dao/scans');
const SessionsDAO = require('../../dao/sessions');
const Shopify = require('../../services/shopify');
const User = require('../../domain-objects/user');
const UsersDAO = require('../../dao/users');
const {
  MAILCHIMP_LIST_ID_USERS,
  REFERRAL_VALUE_DOLLARS
} = require('../../services/config');

const router = new Router();

/**
 * POST /users
 */
function* createUser() {
  const {
    name,
    email,
    password,
    address,
    scan
  } = this.request.body;

  // Validate address data prior to user creation. TODO maybe transaction
  // here instead?
  if (address) {
    try {
      AddressesDAO.validate(address);
    } catch (err) {
      if (err instanceof InvalidDataError) { this.throw(400, err); }
      throw err;
    }
  }

  const user = yield UsersDAO.create({ name, email, password })
    .catch(InvalidDataError, err => this.throw(400, err));

  if (address) {
    const addressData = Object.assign({}, address, {
      userId: user.id
    });

    const addressInstance = yield AddressesDAO.create(addressData);

    user.setAddresses([addressInstance]);
  }

  // NOTE: This is only used as part of the /complete-your-profile internal
  // tool, which we may deprecate at some point.
  // https://github.com/ca-la/site/issues/63
  if (scan) {
    yield ScansDAO.create({
      userId: user.id,
      type: scan.type,
      isComplete: scan.isComplete
    });
  }

  yield MailChimp.subscribe({
    email,
    name,
    referralCode: user.referralCode,
    listId: MAILCHIMP_LIST_ID_USERS
  });

  this.status = 201;

  // Allow `?returnValue=session` on the end of the URL to return a session (with
  // attached user) rather than just a user.
  // Not the most RESTful thing in the world... but much nicer from a client
  // perspective.
  if (this.query.returnValue === 'session') {
    const session = yield SessionsDAO.createForUser(user);
    this.body = session;
  } else {
    this.body = user;
  }
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

  this.body = {
    count,
    referralValueDollars: REFERRAL_VALUE_DOLLARS
  };
}

function* getByReferralCode() {
  this.assert(this.query.referralCode, 400, 'A referral code must be provided to filter on');
  const user = yield UsersDAO.findByReferralCode(this.query.referralCode);

  const response = user && user.toPublicJSON();
  this.body = [response].filter(Boolean);
  this.status = 200;
}

function* getAllUsers() {
  this.assert(this.state.role === User.ROLES.admin, 403);

  const users = yield UsersDAO.findAll({
    limit: Number(this.query.limit) || 10,
    offset: Number(this.query.offset) || 0,
    search: this.query.search
  });

  this.body = users;
  this.status = 200;
}

/**
 * GET /users?referralCode=12312
 *
 * Returns an array to future-proof in case we want to list multiple users in
 * future.
 */
function* getList() {
  if (this.query.referralCode) {
    yield getByReferralCode;
  } else {
    yield getAllUsers;
  }
}

/**
 * GET /users/:id
 */
function* getUser() {
  this.assert(this.state.role === User.ROLES.admin, 403);

  const user = yield UsersDAO.findById(this.params.userId);
  this.assert(user, 404, 'User not found');
  this.body = user;
  this.status = 200;
}

/**
 * GET /users/email-availability/:email
 *
 * Not RESTful. No regrets.
 */
function* getEmailAvailability() {
  const user = yield UsersDAO.findByEmail(this.params.email);

  this.body = { available: !user };

  this.status = 200;
}

router.get('/', attachRole, getList);
router.get('/:userId', requireAuth, attachRole, getUser);
router.get('/:userId/referral-count', requireAuth, getReferralCount);
router.post('/', createUser);
router.put('/:userId/password', requireAuth, updatePassword);
router.get('/email-availability/:email', getEmailAvailability);

module.exports = router.routes();
