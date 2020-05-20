"use strict";

const rethrow = require("pg-rethrow");
const uuid = require("node-uuid");
const _ = require("lodash");

const db = require("../../services/db");
const filterError = require("../../services/filter-error");
const first = require("../../services/first").default;
const InvalidDataError = require("../../errors/invalid-data");
const Session = require("../../domain-objects/session");
const UnauthorizedRoleError = require("../../errors/unauthorized-role");
const UsersDAO = require("../../components/users/dao");
const { compare } = require("../../services/hash");
const {
  ALLOWED_SESSION_ROLES,
} = require("../../components/users/domain-object");

const instantiate = (data) => new Session(data);
const maybeInstantiate = (data) => (data ? instantiate(data) : null);

function ensureCanAssumeRole(user, role) {
  const allowedRoles = ALLOWED_SESSION_ROLES[user.role];

  if (allowedRoles.indexOf(role) < 0) {
    throw new UnauthorizedRoleError(`User may not assume the role '${role}'`);
  }
}

function getSessionExpirationByRole(role) {
  let expiresAt = null;

  if (role === "ADMIN") {
    const now = new Date().getTime();
    expiresAt = new Date(now + 3 * 24 * 60 * 60 * 1000);
  }
  return expiresAt;
}

/**
 * @param {Object} user A User instance
 */
function createForUser(user, additionalData = {}) {
  const defaultRole = ALLOWED_SESSION_ROLES[user.role][0];
  const role = additionalData.role || defaultRole;

  ensureCanAssumeRole(user, role);

  return db("sessions")
    .insert(
      {
        id: uuid.v4(),
        user_id: user.id,
        expires_at: additionalData.expiresAt,
        role,
      },
      "*"
    )
    .then(first)
    .then(instantiate)
    .then((session) => {
      session.setUser(user);
      return session;
    });
}

function create(data) {
  const { email, password, role, expiresAt } = data;

  if (!email || !password) {
    return Promise.reject(new InvalidDataError("Missing required information"));
  }

  let user;

  return UsersDAO.findByEmailWithPasswordHash(email)
    .then((_user) => {
      user = _user;

      if (!user) {
        throw new InvalidDataError("No user found with this email address");
      }

      if (!user.passwordHash) {
        throw new InvalidDataError(
          "It looks like you donʼt have a password yet. To create one, use the Forgot Password link."
        );
      }

      return compare(password, user.passwordHash);
    })
    .then((match) => {
      if (!match) {
        throw new InvalidDataError(`Incorrect password for ${email}`);
      }

      if (role) {
        ensureCanAssumeRole(user, role);
      }
      let expiresOrComputed = expiresAt;
      if (expiresAt !== null && !expiresAt) {
        expiresOrComputed = getSessionExpirationByRole(role);
      }
      user = _.omit(user, "passwordHash");

      return createForUser(user, {
        expiresAt: expiresOrComputed,
        role: role || user.role,
      });
    });
}

/**
 * @param {String} id The session ID
 * @param {Boolean} shouldAttachUser Whether to find the corresponding User
 * resource and attach it to the Session domain object.
 */
function findById(id, shouldAttachUser = false) {
  const now = new Date().toISOString();

  return db("sessions")
    .whereRaw("id = ? and (expires_at is null or expires_at > ?)", [id, now])
    .then(first)
    .then(maybeInstantiate)
    .then((session) => {
      if (session && shouldAttachUser) {
        return UsersDAO.findById(session.userId).then((user) => {
          session.setUser(user);
          return session;
        });
      }

      return session;
    })
    .catch(rethrow)
    .catch(
      filterError(rethrow.ERRORS.InvalidTextRepresentation, () => {
        // If an invalid UUID is passed in, Postgres will complain. Treat this as
        // any other not-found case.
        return null;
      })
    );
}

function deleteByUserId(userId) {
  return db("sessions").where({ user_id: userId }).del();
}

function deleteById(id) {
  return db("sessions").where({ id }).del();
}

module.exports = {
  create,
  createForUser,
  deleteByUserId,
  deleteById,
  findById,
};
