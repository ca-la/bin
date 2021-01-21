import uuid from "node-uuid";
import rethrow = require("pg-rethrow");
import Knex from "knex";

import User, {
  baseUser,
  DANGEROUS_PASSWORD_HASH_DATA_ADAPTER,
  dataAdapter,
  isUserRow,
  partialDataAdapter,
  Role,
  UserIO,
  UserRow,
  UserWithPasswordHash,
} from "./domain-object";
import db from "../../services/db";
import first from "../../services/first";
import InvalidDataError = require("../../errors/invalid-data");
import normalizeEmail = require("../../services/normalize-email");
import UnassignedReferralCodesDAO = require("../../dao/unassigned-referral-codes");
import filterError = require("../../services/filter-error");
import { hash } from "../../services/hash";
import {
  isValidEmail,
  validateAndFormatPhoneNumber,
} from "../../services/validation";
import { validate, validateEvery } from "../../services/validate-from-db";
import limitOrOffset from "../../services/limit-or-offset";
import { omit } from "lodash";
import { updateEmail } from "../../services/mailchimp/update-email";
import { BID_CUTOFF_DATE } from "../bids/dao";

const ERROR_CODES = {
  emailTaken: Symbol("Email taken"),
  phoneTaken: Symbol("Phone taken"),
};

interface CreateOptions {
  requirePassword?: boolean;
  trx?: Knex.Transaction;
}

const TABLE_NAME = "users";

export async function create(
  data: UserIO,
  options: CreateOptions = {}
): Promise<User> {
  const { email, password, phone } = data;

  // Allow passing `options.requirePassword = false` to disable the password
  // requirement. This is a very rare case, so intentionally a bit clumsy.
  const requirePassword = options.requirePassword !== false;

  if (requirePassword && !password) {
    return Promise.reject(new InvalidDataError("Missing required information"));
  }

  if (!email && !phone) {
    return Promise.reject(
      new InvalidDataError("Either phone or email must be provided")
    );
  }

  if (email && !isValidEmail(email)) {
    return Promise.reject(new InvalidDataError("Invalid email"));
  }

  const validatedPhone = phone ? validateAndFormatPhoneNumber(phone) : null;

  const referralCode =
    data.referralCode || (await UnassignedReferralCodesDAO.get());
  const passwordHash = password && (await hash(password));
  const rowData = DANGEROUS_PASSWORD_HASH_DATA_ADAPTER.forInsertion({
    ...baseUser,
    id: uuid.v4(),
    ...omit(data, "password"),
    email: email ? normalizeEmail(email) : null,
    passwordHash,
    phone: validatedPhone,
    referralCode,
  });

  const connection = options.trx || db;
  const user = await connection(TABLE_NAME)
    .insert(rowData, "*")
    .catch(rethrow)
    .catch(
      filterError(
        rethrow.ERRORS.UniqueViolation,
        (err: Error & { constraint: string }) => {
          switch (err.constraint) {
            case "users_unique_email":
              throw new InvalidDataError(
                "Email is already taken",
                ERROR_CODES.emailTaken
              );
            case "users_unique_phone":
              throw new InvalidDataError(
                "Phone number is already taken",
                ERROR_CODES.phoneTaken
              );
            default:
              throw err;
          }
        }
      )
    )
    .then((users: UserRow[]) => first<UserRow>(users));

  return validate<UserRow, User>(TABLE_NAME, isUserRow, dataAdapter, user);
}

export function createSmsPreregistration(data: UserIO): Promise<User> {
  const userData = Object.assign({}, data, {
    isSmsPreregistration: true,
  });

  return create(userData, {
    requirePassword: false,
  });
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<User | null> {
  if (!id) {
    throw new Error("Missing user ID");
  }

  const connection = trx || db;

  const user = await connection(TABLE_NAME)
    .where({ id })
    .then((users: UserRow[]) => first<UserRow>(users));

  if (!user) {
    return null;
  }

  return validate<UserRow, User>(TABLE_NAME, isUserRow, dataAdapter, user);
}

interface FindAllOptions {
  limit?: number;
  offset?: number;
  search?: string;
  role?: Role;
}

export async function findAll({
  limit,
  offset,
  search,
  role,
}: FindAllOptions = {}): Promise<User[]> {
  if ((!limit && limit !== 0) || (!offset && offset !== 0)) {
    throw new Error("Limit and offset must be provided to find all users");
  }

  const users = await db(TABLE_NAME)
    .select("*")
    .orderBy("created_at", "desc")
    .modify((query: Knex.QueryBuilder) => {
      if (search) {
        query.andWhere(
          db.raw("(name ~* :search or email ~* :search)", { search })
        );
      }

      if (role) {
        query.andWhere({ role });
      }
    })
    .modify(limitOrOffset(limit, offset))
    .catch(rethrow)
    .catch(
      filterError(rethrow.ERRORS.InvalidRegularExpression, () => {
        throw new InvalidDataError("Search contained invalid characters");
      })
    );

  return validateEvery<UserRow, User>(
    TABLE_NAME,
    isUserRow,
    dataAdapter,
    users
  );
}

function getByEmailBuilder(
  email: string,
  trx?: Knex.Transaction
): Promise<UserRow | undefined> {
  const normalized = normalizeEmail(email);

  return db("users")
    .whereRaw("lower(users.email) = lower(?)", [normalized])
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((users: UserRow[]) => first<UserRow>(users));
}

export async function findByEmail(
  email: string,
  trx?: Knex.Transaction
): Promise<User | null> {
  const user = await getByEmailBuilder(email, trx);

  if (!user) {
    return null;
  }

  return validate<UserRow, User>(TABLE_NAME, isUserRow, dataAdapter, user);
}

export async function findByEmailWithPasswordHash(
  email: string
): Promise<UserWithPasswordHash | null> {
  const user = await getByEmailBuilder(email);

  if (!user) {
    return null;
  }

  return validate<UserRow, UserWithPasswordHash>(
    TABLE_NAME,
    isUserRow,
    DANGEROUS_PASSWORD_HASH_DATA_ADAPTER,
    user
  );
}

export async function findByReferralCode(referralCode: string): Promise<User> {
  const user = await db("users")
    .whereRaw("lower(referral_code) = ?", referralCode.toLowerCase())
    .then((users: UserRow[]) => first<UserRow>(users));

  return validate<UserRow, User>(TABLE_NAME, isUserRow, dataAdapter, user);
}

export async function hasPasswordSet(
  userId: string,
  trx?: Knex.Transaction
): Promise<boolean> {
  const { has_password_set: hasPassword } = await db("users")
    .first()
    .select(db.raw("count(*) = 0 as has_password_set"))
    .where({
      id: userId,
      password_hash: null,
    })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return hasPassword;
}

export async function updatePassword(
  userId: string,
  password: string,
  trx?: Knex.Transaction
): Promise<User> {
  const passwordHash = await hash(password);

  const user = await db("users")
    .where({ id: userId })
    .update({ password_hash: passwordHash }, "*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((users: UserRow[]) => first<UserRow>(users));

  if (!user) {
    throw new Error("Failed to update Password");
  }

  return validate<UserRow, User>(TABLE_NAME, isUserRow, dataAdapter, user);
}

export async function update(
  userId: string,
  data: Partial<User>,
  trx?: Knex.Transaction
): Promise<User> {
  let previousEmail;
  if (data.email) {
    if (!isValidEmail(data.email)) {
      return Promise.reject(new InvalidDataError("Invalid email"));
    }
    const beforeUpdate = await findById(userId);
    previousEmail = beforeUpdate ? beforeUpdate.email : null;
  }
  const rowData = partialDataAdapter.forInsertion(data);

  const user = await db("users")
    .where({ id: userId })
    .update(rowData, "*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((users: UserRow[]) => first<UserRow>(users));

  if (previousEmail && user && user.email) {
    await updateEmail(previousEmail, user.email);
  }

  return validate<UserRow, User>(TABLE_NAME, isUserRow, dataAdapter, user);
}

export async function completeSmsPreregistration(
  userId: string,
  data: UserIO
): Promise<User> {
  const { phone, password } = data;

  if (!password) {
    throw new InvalidDataError("Password must be set");
  }

  const validatedPhone = validateAndFormatPhoneNumber(phone);
  const passwordHash = await hash(password);
  const rowData = DANGEROUS_PASSWORD_HASH_DATA_ADAPTER.forInsertion({
    ...baseUser,
    ...omit(data, "password"),
    id: userId,
    isSmsPreregistration: false,
    passwordHash,
    phone: validatedPhone,
  });

  const user = await db("users")
    .where({ id: userId })
    .update(rowData, "*")
    .then((users: UserRow[]) => first<UserRow>(users))
    .catch(rethrow)
    .catch(
      filterError(
        rethrow.ERRORS.UniqueViolation,
        (err: Error & { constraint: string }) => {
          switch (err.constraint) {
            case "users_unique_email":
              throw new InvalidDataError(
                "Email is already taken",
                ERROR_CODES.emailTaken
              );
            case "users_unique_phone":
              throw new InvalidDataError(
                "Phone number is already taken",
                ERROR_CODES.phoneTaken
              );
            default:
              throw err;
          }
        }
      )
    );

  if (!user) {
    throw new Error("Unable to update user");
  }

  return validate<UserRow, User>(TABLE_NAME, isUserRow, dataAdapter, user);
}

export async function findByBidId(bidId: string): Promise<User[]> {
  const users = await db("design_events")
    .select("users.*")
    .join("pricing_bids", (join: Knex.JoinClause) => {
      join
        .on("design_events.bid_id", "=", "pricing_bids.id")
        .andOnIn("design_events.type", ["BID_DESIGN"]);
    })
    .whereNotIn(
      "design_events.target_id",
      db
        .select("design_events.target_id")
        .from("design_events")
        .where({ "design_events.bid_id": bidId })
        .whereIn("design_events.type", ["REMOVE_PARTNER"])
    )
    .join("users", "users.id", "design_events.target_id")
    .where({ "pricing_bids.id": bidId })
    .groupBy(["users.id", "users.created_at"])
    .orderBy("users.created_at");

  return validateEvery<UserRow, User>(
    TABLE_NAME,
    isUserRow,
    dataAdapter,
    users
  );
}

export async function findAllUnpaidPartners({
  limit,
  offset,
}: FindAllOptions = {}): Promise<User[]> {
  if ((!limit && limit !== 0) || (!offset && offset !== 0)) {
    throw new Error(
      "Limit and offset must be provided to find all unpaid partners"
    );
  }

  const partners = await db(TABLE_NAME)
    .distinct()
    .select("users.*")
    .join("design_events as de", "users.id", "de.actor_id")
    .join("pricing_bids as b", "de.bid_id", "b.id")
    .leftJoin("partner_payout_logs as l", "b.id", "l.bid_id")
    .where({ "de.type": "ACCEPT_SERVICE_BID" })
    .andWhere("de.created_at", ">", new Date(BID_CUTOFF_DATE))
    .whereNotIn("b.id", (subquery: Knex.QueryBuilder) =>
      subquery
        .from("design_events")
        .select("bid_id")
        .where({ type: "REMOVE_PARTNER" })
    )
    .modify(limitOrOffset(limit, offset))
    .groupBy(["b.id", "users.id", "b.bid_price_cents"])
    .having(
      db.raw("b.bid_price_cents > coalesce(sum(l.payout_amount_cents), 0)")
    )
    .catch(rethrow)
    .catch(
      filterError(rethrow.ERRORS.InvalidRegularExpression, () => {
        throw new InvalidDataError("Search contained invalid characters");
      })
    );

  return validateEvery<UserRow, User>(
    TABLE_NAME,
    isUserRow,
    dataAdapter,
    partners
  );
}
