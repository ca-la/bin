import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";
import toDateOrNull, {
  toDateStringOrNull,
  toDateStringOrUndefined,
} from "../../services/to-date";
import User, { UserRow, UserWithPasswordHash, UserIO } from "./types";

export * from "./types";

export default User;

export function partialDecode(data: Partial<User>): Partial<UserRow> {
  return {
    birthday: data.birthday,
    email: data.email,
    is_sms_preregistration: data.isSmsPreregistration,
    last_accepted_designer_terms_at: toDateStringOrUndefined(
      data.lastAcceptedDesignerTermsAt
    ),
    last_accepted_partner_terms_at: toDateStringOrUndefined(
      data.lastAcceptedPartnerTermsAt
    ),
    locale: data.locale,
    name: data.name,
    phone: data.phone,
    referral_code: data.referralCode,
    role: data.role,
  };
}

export function passwordHashDecode(data: UserWithPasswordHash): UserRow {
  return {
    birthday: data.birthday,
    created_at: data.createdAt.toISOString(),
    email: data.email,
    id: data.id,
    is_sms_preregistration: data.isSmsPreregistration,
    last_accepted_designer_terms_at: toDateStringOrNull(
      data.lastAcceptedDesignerTermsAt
    ),
    last_accepted_partner_terms_at: toDateStringOrNull(
      data.lastAcceptedPartnerTermsAt
    ),
    locale: data.locale,
    name: data.name,
    password_hash: data.passwordHash,
    phone: data.phone,
    referral_code: data.referralCode,
    role: data.role,
  };
}

export function passwordHashEncode(row: UserRow): UserWithPasswordHash {
  return {
    birthday: row.birthday,
    createdAt: new Date(row.created_at),
    email: row.email,
    id: row.id,
    isSmsPreregistration: row.is_sms_preregistration,
    lastAcceptedDesignerTermsAt: toDateOrNull(
      row.last_accepted_designer_terms_at
    ),
    lastAcceptedPartnerTermsAt: toDateOrNull(
      row.last_accepted_partner_terms_at
    ),
    locale: row.locale,
    name: row.name,
    passwordHash: row.password_hash,
    phone: row.phone,
    referralCode: row.referral_code,
    role: row.role,
  };
}

export function encode(row: UserRow): User {
  return {
    birthday: row.birthday,
    createdAt: new Date(row.created_at),
    email: row.email,
    id: row.id,
    isSmsPreregistration: row.is_sms_preregistration,
    lastAcceptedDesignerTermsAt: toDateOrNull(
      row.last_accepted_designer_terms_at
    ),
    lastAcceptedPartnerTermsAt: toDateOrNull(
      row.last_accepted_partner_terms_at
    ),
    locale: row.locale,
    name: row.name,
    phone: row.phone,
    referralCode: row.referral_code,
    role: row.role,
  };
}

export const dataAdapter = new DataAdapter<UserRow, User>(encode);

export const DANGEROUS_PASSWORD_HASH_DATA_ADAPTER = new DataAdapter<
  UserRow,
  UserWithPasswordHash
>(passwordHashEncode, passwordHashDecode);

export const partialDataAdapter = new DataAdapter<
  Partial<UserRow>,
  Partial<User>
>(undefined, partialDecode);

export function isUserRow(row: object): row is UserRow {
  return hasProperties(
    row,
    "created_at",
    "email",
    "id",
    "is_sms_preregistration",
    "locale",
    "name",
    "password_hash",
    "phone",
    "referral_code",
    "role"
  );
}

export function isUserIO(data: object): data is UserIO {
  return hasProperties(data, "email", "name", "password", "phone");
}
