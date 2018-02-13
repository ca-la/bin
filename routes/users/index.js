'use strict';

const Router = require('koa-router');

const AddressesDAO = require('../../dao/addresses');
const canAccessUserResource = require('../../middleware/can-access-user-resource');
const claimDesignInvitations = require('../../services/claim-design-invitations');
const InvalidDataError = require('../../errors/invalid-data');
const MailChimp = require('../../services/mailchimp');
const requireAuth = require('../../middleware/require-auth');
const ScansDAO = require('../../dao/scans');
const SessionsDAO = require('../../dao/sessions');
const Shopify = require('../../services/shopify');
const Twilio = require('../../services/twilio');
const User = require('../../domain-objects/user');
const UsersDAO = require('../../dao/users');
const { logServerError } = require('../../services/logger');
const {
  TWILIO_PREREGISTRATION_OUTBOUND_NUMBER,
  REFERRAL_VALUE_DOLLARS
} = require('../../config');

const router = new Router();

/**
 * POST /users
 */
function* createUser() {
  const {
    name,
    email,
    phone,
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

  this.assert(name, 400, 'Name must be provided');
  this.assert(email, 400, 'Email must be provided');

  const referralCode = 'n/a';

  const user = yield UsersDAO.create({
    name,
    email,
    password,
    phone,
    referralCode
  })
    .catch(InvalidDataError, err => this.throw(400, err));

  // Previously we had this *before* the user creation in the DB, effectively
  // using it as a more powerful email validator. That has proven to be noisy as
  // we attempt to subscribe lots of invalid and duplicate emails whenever
  // someone makes a mistake signing up.
  try {
    yield MailChimp.subscribeToUsers({
      email,
      name,
      referralCode
    });
  } catch (err) {
    // Not rethrowing since this shouldn't be fatal... but if we ever see this
    // log line we need to investigate ASAP (and manually subscribe the user)
    logServerError(`Failed to sign up user to Mailchimp: ${email}`);
  }

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

  yield claimDesignInvitations(
    user.email,
    user.id
  );

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

function* acceptDesignerTerms() {
  canAccessUserResource.call(this, this.params.userId);

  const updated = yield UsersDAO.update(this.params.userId, {
    lastAcceptedDesignerTermsAt: new Date()
  });

  if (this.query.returnValue === 'session') {
    const session = yield SessionsDAO.createForUser(updated, { role: this.state.role });
    this.body = session;
  } else {
    this.body = { ok: true };
  }

  this.status = 200;
}

function* acceptPartnerTerms() {
  canAccessUserResource.call(this, this.params.userId);

  const updated = yield UsersDAO.update(this.params.userId, {
    lastAcceptedPartnerTermsAt: new Date()
  });

  if (this.query.returnValue === 'session') {
    const session = yield SessionsDAO.createForUser(updated, { role: this.state.role });
    this.body = session;
  } else {
    this.body = { ok: true };
  }

  this.status = 200;
}

/**
 * PUT /users/:userId
 */
function* updateUser() {
  const isAdmin = (this.state.role === User.ROLES.admin);
  const isCurrentUser = (this.params.userId === this.state.userId);

  this.assert(isAdmin || isCurrentUser, 403, 'You can only update your own user');

  const { birthday, name, email, role } = this.request.body;
  const data = { birthday, name, email };

  if (isAdmin && role) {
    data.role = role;
    yield SessionsDAO.deleteByUserId(this.params.userId);
  }

  const updated = yield UsersDAO.update(this.params.userId, data)
    .catch(InvalidDataError, err => this.throw(400, err));

  this.status = 200;
  this.body = updated;
}

/**
 * POST /users/:userId/complete-sms-preregistration
 */
function* completeSmsPreregistration() {
  this.assert(this.params.userId === this.state.userId, 403, 'You can only update your own user');

  const {
    name,
    email,
    phone,
    password,
    address
  } = this.request.body;

  this.assert(
    name && email && phone && password && address,
    400,
    'Missing required information'
  );

  try {
    AddressesDAO.validate(address);
  } catch (err) {
    if (err instanceof InvalidDataError) { this.throw(400, err); }
    throw err;
  }

  const user = yield UsersDAO.findById(this.params.userId);
  this.assert(user.isSmsPreregistration === true, 400, "You've already completed your registration");

  const updated = yield UsersDAO.completeSmsPreregistration(
    this.params.userId,
    { name, email, phone, password }
  )
    .catch(InvalidDataError, err => this.throw(400, err));

  const [firstName, lastName] = name.split(' ');

  yield Shopify.updateCustomerByPhone(phone, {
    last_name: lastName,
    first_name: firstName,
    phone,
    email,
    addresses: [
      {
        default: true,
        address1: address.addressLine1,
        address2: address.addressLine2,
        company: address.companyName,
        city: address.city,
        province: address.region,
        phone,
        zip: address.postCode,
        last_name: lastName,
        first_name: firstName,
        country: address.country
      }
    ]
  });

  if (address) {
    const addressData = Object.assign({}, address, {
      userId: user.id
    });

    const addressInstance = yield AddressesDAO.create(addressData);

    updated.setAddresses([addressInstance]);
  }

  yield Twilio.sendSMS(
    phone,
    'Thanks for signing up! Your profile is now complete',
    {
      from: TWILIO_PREREGISTRATION_OUTBOUND_NUMBER
    }
  );

  this.status = 200;
  this.body = updated;
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
  this.assert(this.state.userId, 401);
  this.assert(this.state.role === User.ROLES.admin, 403);

  const users = yield UsersDAO.findAll({
    limit: Number(this.query.limit) || 10,
    offset: Number(this.query.offset) || 0,
    role: this.query.role,
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
  const { email } = this.params;

  const user = yield UsersDAO.findByEmail(email);

  const isValid = UsersDAO.isValidEmail(email);
  const isTaken = Boolean(user);

  this.body = {
    isValid,
    isTaken,
    available: isValid && !isTaken
  };

  this.status = 200;
}

router.get('/', getList);
router.get('/:userId', requireAuth, getUser);
router.get('/:userId/referral-count', requireAuth, getReferralCount);
router.get('/email-availability/:email', getEmailAvailability);
router.post('/', createUser);
router.post('/:userId/complete-sms-preregistration', completeSmsPreregistration);
router.post('/:userId/accept-designer-terms', requireAuth, acceptDesignerTerms);
router.post('/:userId/accept-partner-terms', requireAuth, acceptPartnerTerms);
router.put('/:userId', requireAuth, updateUser); // TODO: deprecate
router.patch('/:userId', requireAuth, updateUser);
router.put('/:userId/password', requireAuth, updatePassword);

module.exports = router.routes();
