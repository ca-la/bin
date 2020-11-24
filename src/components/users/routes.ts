import Knex from "knex";
import Router from "koa-router";
import rethrow = require("pg-rethrow");

import * as UsersDAO from "./dao";
import applyCode from "../../components/promo-codes/apply-code";
import canAccessUserResource = require("../../middleware/can-access-user-resource");
import claimDesignInvitations = require("../../services/claim-design-invitations");
import CohortsDAO = require("../../components/cohorts/dao");
import CohortUsersDAO = require("../../components/cohorts/users/dao");
import compact from "../../services/compact";
import createOrUpdateSubscription from "../subscriptions/create-or-update";
import db from "../../services/db";
import DuplicationService = require("../../services/duplicate");
import filterError = require("../../services/filter-error");
import InvalidDataError from "../../errors/invalid-data";
import MailChimp = require("../../services/mailchimp");
import MultipleErrors from "../../errors/multiple-errors";
import requireAuth = require("../../middleware/require-auth");
import SessionsDAO = require("../../dao/sessions");
import TeamUsersDAO from "../../components/team-users/dao";
import User, { Role, ROLES, UserIO } from "./domain-object";
import { DEFAULT_DESIGN_IDS, REQUIRE_CALA_EMAIL } from "../../config";
import { hasProperties } from "../../services/require-properties";
import { isValidEmail } from "../../services/validation";
import { logServerError } from "../../services/logger";
import { validatePassword } from "./services/validate-password";
import { createTeamWithOwner } from "../teams/service";

const router = new Router();

interface CreateBody extends UserIO {
  planId?: string;
  stripeCardToken?: string;
}

/**
 * POST /users
 */
function* createUser(this: PublicContext<CreateBody>): Iterator<any, any, any> {
  const {
    name,
    email,
    password,
    phone,
    lastAcceptedDesignerTermsAt,
    planId,
    stripeCardToken,
  } = this.request.body;
  const { cohort, initialDesigns, promoCode } = this.query;

  if (!email) {
    this.throw(400, "Email must be provided");
  }

  if (REQUIRE_CALA_EMAIL && !email.match(/@((ca\.la)|(calastg\.com))$/)) {
    // tslint:disable-next-line:max-line-length
    this.throw(
      400,
      "Only @ca.la or @calastg.com emails can sign up on this server. Please visit https://app.ca.la to access the live version of Studio"
    );
  }

  const referralCode = "n/a";

  // TODO: Move all other resource creations into transaction
  const user = yield db.transaction(async (trx: Knex.Transaction) => {
    const userInTrx = await UsersDAO.create(
      {
        email,
        lastAcceptedDesignerTermsAt,
        name,
        password,
        phone,
        referralCode,
        role: ROLES.user,
      },
      { requirePassword: false, trx }
    ).catch(
      filterError(InvalidDataError, (err: Error) => this.throw(400, err))
    );

    if (planId) {
      await createOrUpdateSubscription({
        userId: userInTrx.id,
        stripeCardToken,
        planId,
        trx,
      }).catch(
        filterError(InvalidDataError, (err: InvalidDataError) =>
          this.throw(400, err)
        )
      );
    }

    if (typeof name === "string") {
      await createTeamWithOwner(trx, `${name}'s Team`, userInTrx.id);
    }

    await TeamUsersDAO.claimAllByEmail(trx, email, userInTrx.id);

    return userInTrx;
  });

  let targetCohort = null;
  if (cohort) {
    targetCohort = yield CohortsDAO.findBySlug(cohort);

    if (targetCohort) {
      yield CohortUsersDAO.create({
        cohortId: targetCohort.id,
        userId: user.id,
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
      referralCode,
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
    const defaultDesignIds = DEFAULT_DESIGN_IDS.split(",");
    yield DuplicationService.duplicateDesigns(user.id, defaultDesignIds);
  }

  // Allow `?returnValue=session` on the end of the URL to return a session (with
  // attached user) rather than just a user.
  // Not the most RESTful thing in the world... but much nicer from a client
  // perspective.
  if (this.query.returnValue === "session") {
    const session = yield SessionsDAO.createForUser(user);
    this.body = session;
  } else {
    this.body = user;
  }

  this.status = 201;
}

/**
 * PUT /users/:userId/password
 * @param {String} password
 */
interface WithPassword {
  password: string;
}
function* updatePassword(
  this: AuthedContext<WithPassword>
): Iterator<any, any, any> {
  this.assert(
    this.params.userId === this.state.userId,
    403,
    "You can only update your own user"
  );
  const { body } = this.request;
  const hasPassword = (data: object): data is WithPassword => {
    return hasProperties(data, "password");
  };
  this.assert(hasPassword(body), 400, "Must include a password");

  const { password } = body;
  yield UsersDAO.updatePassword(this.params.userId, password);

  this.status = 200;
  this.body = { ok: true };
}

function* acceptDesignerTerms(this: AuthedContext): Iterator<any, any, any> {
  canAccessUserResource.call(this, this.params.userId);
  const updated = yield UsersDAO.update(this.params.userId, {
    lastAcceptedDesignerTermsAt: new Date(),
  });

  if (this.query.returnValue === "session") {
    const session = yield SessionsDAO.createForUser(updated, {
      role: this.state.role,
    });
    this.body = session;
  } else {
    this.body = { ok: true };
  }

  this.status = 200;
}

function* acceptPartnerTerms(this: AuthedContext): Iterator<any, any, any> {
  canAccessUserResource.call(this, this.params.userId);

  const updated = yield UsersDAO.update(this.params.userId, {
    lastAcceptedPartnerTermsAt: new Date(),
  });

  if (this.query.returnValue === "session") {
    const session = yield SessionsDAO.createForUser(updated, {
      role: this.state.role,
    });
    this.body = session;
  } else {
    this.body = { ok: true };
  }

  this.status = 200;
}

interface UserWithNewPassword extends User {
  currentPassword?: string;
  newPassword?: string;
}
interface CaughtError extends Error {
  field: string;
  message: string;
}

/**
 * PUT /users/:userId
 */
function* updateUser(
  this: AuthedContext<UserWithNewPassword>
): Iterator<any, any, any> {
  const isAdmin = this.state.role === ROLES.admin;
  const isCurrentUser = this.params.userId === this.state.userId;

  this.assert(
    isAdmin || isCurrentUser,
    403,
    "You can only update your own user"
  );
  const { body } = this.request;
  const {
    name,
    locale,
    phone,
    email,
    role,
    newPassword,
    currentPassword,
  } = body;

  if (isAdmin && role) {
    yield SessionsDAO.deleteByUserId(this.params.userId);
  }
  const errors: (Error | CaughtError)[] = [];

  const updatedValues: Partial<User> = {
    email,
    locale,
    name,
    phone,
  };

  if (isAdmin) {
    Object.assign(updatedValues, {
      role,
    });
  }

  const updated = yield db
    .transaction(async (trx: Knex.Transaction) => {
      if (newPassword && currentPassword) {
        const doPasswordsMatch = await validatePassword(
          this.params.userId,
          currentPassword
        );
        if (doPasswordsMatch) {
          await UsersDAO.updatePassword(this.params.userId, newPassword, trx);
        } else {
          errors.push({
            field: "password",
            message: "Invalid password",
            name: "InvalidPassword",
          });
        }
      } else if (newPassword && !currentPassword) {
        const hasPasswordSet = await UsersDAO.hasPasswordSet(
          this.state.userId,
          trx
        );
        if (!hasPasswordSet) {
          await UsersDAO.updatePassword(this.state.userId, newPassword, trx);
        } else {
          errors.push({
            field: "password",
            message: "A password is already set for this account",
            name: "PasswordIsAlreadySet",
          });
        }
      }

      const beforeUpdate = await UsersDAO.findById(this.params.userId, trx);

      if (Object.keys(compact(updatedValues)).length === 0) {
        return beforeUpdate;
      }

      if (!beforeUpdate) {
        this.throw(404, `User not found with ID: ${this.params.userId}`);
      }

      if (beforeUpdate.name === null && Boolean(updatedValues.name)) {
        await createTeamWithOwner(
          trx,
          `${updatedValues.name}'s Team`,
          this.params.userId
        );
      }

      return UsersDAO.update(this.params.userId, updatedValues, trx)
        .catch(rethrow)
        .catch(
          filterError(
            rethrow.ERRORS.UniqueViolation,
            (err: Error & { constraint: string }) => {
              switch (err.constraint) {
                case "users_unique_email":
                  errors.push({
                    field: "email",
                    message: "Invalid email",
                    name: "InvalidEmail",
                  });
                  break;
                default:
                  errors.push(err);
              }
            }
          )
        );
    })
    .catch((err: Error): void => {
      errors.push(err);
    });

  if (errors.length > 0) {
    const error = new MultipleErrors<Error | CaughtError>(errors);
    this.throw(400, error);
  }

  this.status = 200;
  this.body = updated;
}

function* getAllUsers(this: AuthedContext): Iterator<any, any, any> {
  this.assert(this.state.userId, 401);
  this.assert(this.state.role === ROLES.admin, 403);

  const users = yield UsersDAO.findAll({
    limit: Number(this.query.limit) || 10,
    offset: Number(this.query.offset) || 0,
    role: this.query.role as Role,
    search: this.query.search,
  });

  this.body = users;
  this.status = 200;
}

function* getList(this: AuthedContext): Iterator<any, any, any> {
  yield getAllUsers;
}

/**
 * GET /users/:id
 */
function* getUser(this: AuthedContext): Iterator<any, any, any> {
  this.assert(this.state.role === ROLES.admin, 403);

  const user = yield UsersDAO.findById(this.params.userId);
  this.assert(user, 404, "User not found");
  this.body = user;
  this.status = 200;
}

/**
 * GET /users/email-availability/:email
 *
 * Not RESTful. No regrets.
 */
function* getEmailAvailability(this: AuthedContext): Iterator<any, any, any> {
  const { email } = this.params;

  const user = yield UsersDAO.findByEmail(email);

  const isValid = isValidEmail(email);
  const isTaken = Boolean(user);

  this.body = {
    available: isValid && !isTaken,
    isTaken,
    isValid,
  };

  this.status = 200;
}

/**
 * GET /users/email-availability/:email
 */
function* getUnpaidPartners(this: AuthedContext): Iterator<any, any, any> {
  const partners = yield UsersDAO.findAllUnpaidPartners({
    limit: Number(this.query.limit) || 10,
    offset: Number(this.query.offset) || 0,
    role: this.query.role as Role,
    search: this.query.search,
  });

  this.body = partners;

  this.status = 200;
}

router.get("/", getList);
router.get("/:userId", requireAuth, getUser);
router.get("/email-availability/:email", getEmailAvailability);
router.get("/unpaid-partners", getUnpaidPartners);
router.post("/", createUser);
router.post("/:userId/accept-designer-terms", requireAuth, acceptDesignerTerms);
router.post("/:userId/accept-partner-terms", requireAuth, acceptPartnerTerms);
router.put("/:userId", requireAuth, updateUser); // TODO: deprecate
router.put("/:userId/password", requireAuth, updatePassword);
router.patch("/:userId", requireAuth, updateUser);

export default router.routes();
