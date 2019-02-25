'use strict';

const Router = require('koa-router');

const applyCode = require('../../components/promo-codes/apply-code').default;
const canAccessUserResource = require('../../middleware/can-access-user-resource');
const claimDesignInvitations = require('../../services/claim-design-invitations');
const CohortsDAO = require('../../components/cohorts/dao');
const CohortUsersDAO = require('../../components/cohorts/users/dao');
const DuplicationService = require('../../services/duplicate');
const filterError = require('../../services/filter-error');
const InvalidDataError = require('../../errors/invalid-data');
const MailChimp = require('../../services/mailchimp');
const requireAuth = require('../../middleware/require-auth');
const SessionsDAO = require('../../dao/sessions');
const User = require('../../domain-objects/user');
const UsersDAO = require('../../dao/users');
const { logServerError } = require('../../services/logger');
const { REQUIRE_CALA_EMAIL } = require('../../config');

const router = new Router();

/**
 * POST /users
 */
function* createUser() {
  const {
    name,
    email,
    phone,
    password
  } = this.request.body;
  const { cohort, initialDesigns, promoCode } = this.request.query;

  this.assert(name, 400, 'Name must be provided');
  this.assert(email, 400, 'Email must be provided');

  if (REQUIRE_CALA_EMAIL && !email.match(/@ca\.la$/)) {
    this.throw(400, 'Only @ca.la emails can sign up on this server. Please visit https://studio.ca.la to access the live version of Studio');
  }

  const referralCode = 'n/a';

  const user = yield UsersDAO.create({
    name,
    email,
    password,
    phone,
    referralCode
  }).catch(filterError(InvalidDataError, err => this.throw(400, err)));

  let targetCohort = null;
  if (cohort) {
    targetCohort = yield CohortsDAO.findBySlug(cohort);

    if (targetCohort) {
      yield CohortUsersDAO.create({
        userId: user.id,
        cohortId: targetCohort.id
      });
    }
  }

  if (promoCode) {
    yield applyCode(user.id, promoCode);
  }

  // Previously we had this *before* the user creation in the DB, effectively
  // using it as a more powerful email validator. That has proven to be noisy as
  // we attempt to subscribe lots of invalid and duplicate emails whenever
  // someone makes a mistake signing up.
  try {
    yield MailChimp.subscribeToUsers({
      email,
      name,
      referralCode,
      cohort: targetCohort && targetCohort.slug
    });
  } catch (err) {
    // Not rethrowing since this shouldn't be fatal... but if we ever see this
    // log line we need to investigate ASAP (and manually subscribe the user)
    logServerError(`Failed to sign up user to Mailchimp: ${email}`);
  }

  yield claimDesignInvitations(
    user.email,
    user.id
  );

  if (initialDesigns && Array.isArray(initialDesigns)) {
    yield DuplicationService.duplicateDesigns(user.id, initialDesigns);
  }

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

  const {
    birthday, name, email, role, phone
  } = this.request.body;
  const data = {
    birthday, name, email, phone
  };

  if (isAdmin && role) {
    data.role = role;
    yield SessionsDAO.deleteByUserId(this.params.userId);
  }

  const updated = yield UsersDAO.update(this.params.userId, data)
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

  this.status = 200;
  this.body = updated;
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

function* getList() {
  yield getAllUsers;
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
router.get('/email-availability/:email', getEmailAvailability);
router.post('/', createUser);
router.post('/:userId/accept-designer-terms', requireAuth, acceptDesignerTerms);
router.post('/:userId/accept-partner-terms', requireAuth, acceptPartnerTerms);
router.put('/:userId', requireAuth, updateUser); // TODO: deprecate
router.patch('/:userId', requireAuth, updateUser);
router.put('/:userId/password', requireAuth, updatePassword);

module.exports = router.routes();
