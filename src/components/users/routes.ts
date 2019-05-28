import * as Router from 'koa-router';
import * as Koa from 'koa';

import MailChimp = require('../../services/mailchimp');
import InvalidDataError = require('../../errors/invalid-data');
import applyCode from '../../components/promo-codes/apply-code';
import claimDesignInvitations = require('../../services/claim-design-invitations');
import CohortsDAO = require('../../components/cohorts/dao');
import CohortUsersDAO = require('../../components/cohorts/users/dao');
import DuplicationService = require('../../services/duplicate');
import filterError = require('../../services/filter-error');
import canAccessUserResource = require('../../middleware/can-access-user-resource');
import { hasProperties } from '../../services/require-properties';
import requireAuth = require('../../middleware/require-auth');
import SessionsDAO = require('../../dao/sessions');
import User, { Role, ROLES, UserIO } from './domain-object';
import * as UsersDAO from './dao';
import { logServerError } from '../../services/logger';
import { DEFAULT_DESIGN_IDS, REQUIRE_CALA_EMAIL } from '../../config';
import { isValidEmail } from '../../services/validation';
import { canCreateAccount } from '../../middleware/can-create-account';

const router = new Router();

/**
 * POST /users
 */
function* createUser(
  this: Koa.Application.Context<UserIO>
): AsyncIterableIterator<User> {
  const { name, email } = this.request.body;
  const { cohort, initialDesigns, promoCode } = this.query;

  if (!email) {
    return this.throw(400, 'Email must be provided');
  }
  if (!name) {
    return this.throw(400, 'Name must be provided');
  }

  if (REQUIRE_CALA_EMAIL && !email.match(/@ca\.la$/)) {
    // tslint:disable-next-line:max-line-length
    this.throw(
      400,
      'Only @ca.la emails can sign up on this server. Please visit https://studio.ca.la to access the live version of Studio'
    );
  }

  const referralCode = 'n/a';

  const user = yield UsersDAO.create({
    ...this.request.body,
    referralCode,
    role: ROLES.user
  }).catch(filterError(InvalidDataError, (err: Error) => this.throw(400, err)));

  let targetCohort = null;
  if (cohort) {
    targetCohort = yield CohortsDAO.findBySlug(cohort);

    if (targetCohort) {
      yield CohortUsersDAO.create({
        cohortId: targetCohort.id,
        userId: user.id
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
      cohort: targetCohort && targetCohort.slug,
      email,
      name,
      referralCode
    });
  } catch (err) {
    // Not rethrowing since this shouldn't be fatal... but if we ever see this
    // log line we need to investigate ASAP (and manually subscribe the user)
    logServerError(`Failed to sign up user to Mailchimp: ${email}`);
  }

  yield claimDesignInvitations(user.email, user.id);

  if (
    initialDesigns &&
    Array.isArray(initialDesigns) &&
    initialDesigns.length > 0
  ) {
    // Intentionally not checking ownership permissions - TODO reconsider security model
    yield DuplicationService.duplicateDesigns(user.id, initialDesigns);
  } else {
    // This will start off the user with any number of 'default' designs that
    // will automatically show in their drafts when they first log in.
    const defaultDesignIds = DEFAULT_DESIGN_IDS.split(',');
    yield DuplicationService.duplicateDesigns(user.id, defaultDesignIds);
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
interface WithPassword {
  password: string;
}
function* updatePassword(
  this: Koa.Application.Context<{ password: string }>
): AsyncIterableIterator<object> {
  this.assert(
    this.params.userId === this.state.userId,
    403,
    'You can only update your own user'
  );
  const { body } = this.request;
  const hasPassword = (data: object): data is WithPassword => {
    return hasProperties(data, 'password');
  };
  this.assert(hasPassword(body), 400, 'Must include a password');

  const { password } = body;
  yield UsersDAO.updatePassword(this.params.userId, password);

  this.status = 200;
  this.body = { ok: true };
}

function* acceptDesignerTerms(
  this: Koa.Application.Context
): AsyncIterableIterator<User> {
  canAccessUserResource.call(this, this.params.userId);
  const updated = yield UsersDAO.update(this.params.userId, {
    lastAcceptedDesignerTermsAt: new Date()
  });

  if (this.query.returnValue === 'session') {
    const session = yield SessionsDAO.createForUser(updated, {
      role: this.state.role
    });
    this.body = session;
  } else {
    this.body = { ok: true };
  }

  this.status = 200;
}

function* acceptPartnerTerms(
  this: Koa.Application.Context
): AsyncIterableIterator<User> {
  canAccessUserResource.call(this, this.params.userId);

  const updated = yield UsersDAO.update(this.params.userId, {
    lastAcceptedPartnerTermsAt: new Date()
  });

  if (this.query.returnValue === 'session') {
    const session = yield SessionsDAO.createForUser(updated, {
      role: this.state.role
    });
    this.body = session;
  } else {
    this.body = { ok: true };
  }

  this.status = 200;
}

/**
 * PUT /users/:userId
 */
function* updateUser(
  this: Koa.Application.Context<UserIO>
): AsyncIterableIterator<User> {
  const isAdmin = this.state.role === ROLES.admin;
  const isCurrentUser = this.params.userId === this.state.userId;

  this.assert(
    isAdmin || isCurrentUser,
    403,
    'You can only update your own user'
  );
  const { body } = this.request;

  if (isAdmin && body.role) {
    yield SessionsDAO.deleteByUserId(this.params.userId);
  }

  const updated = yield UsersDAO.update(this.params.userId, body).catch(
    filterError(InvalidDataError, (err: Error) => this.throw(400, err))
  );

  this.status = 200;
  this.body = updated;
}

function* getAllUsers(
  this: Koa.Application.Context
): AsyncIterableIterator<User[]> {
  this.assert(this.state.userId, 401);
  this.assert(this.state.role === ROLES.admin, 403);

  const users = yield UsersDAO.findAll({
    limit: Number(this.query.limit) || 10,
    offset: Number(this.query.offset) || 0,
    role: this.query.role as Role,
    search: this.query.search
  });

  this.body = users;
  this.status = 200;
}

function* getList(
  this: Koa.Application.Context
): AsyncIterableIterator<User[]> {
  yield getAllUsers;
}

/**
 * GET /users/:id
 */
function* getUser(
  this: Koa.Application.Context
): AsyncIterableIterator<User[]> {
  this.assert(this.state.role === ROLES.admin, 403);

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
function* getEmailAvailability(
  this: Koa.Application.Context
): AsyncIterableIterator<User[]> {
  const { email } = this.params;

  const user = yield UsersDAO.findByEmail(email);

  const isValid = isValidEmail(email);
  const isTaken = Boolean(user);

  this.body = {
    available: isValid && !isTaken,
    isTaken,
    isValid
  };

  this.status = 200;
}

router.get('/', getList);
router.get('/:userId', requireAuth, getUser);
router.get('/email-availability/:email', getEmailAvailability);
router.post('/', canCreateAccount, createUser);
router.post('/:userId/accept-designer-terms', requireAuth, acceptDesignerTerms);
router.post('/:userId/accept-partner-terms', requireAuth, acceptPartnerTerms);
router.put('/:userId', requireAuth, updateUser); // TODO: deprecate
router.patch('/:userId', requireAuth, updateUser);
router.put('/:userId/password', requireAuth, updatePassword);

export default router.routes();
