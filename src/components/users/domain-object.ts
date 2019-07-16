import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';
import toDateOrNull, {
  toDateStringOrNull,
  toDateStringOrUndefined
} from '../../services/to-date';

export type Role = 'ADMIN' | 'FIT_PARTNER' | 'PARTNER' | 'USER';

export const ROLES: { [id: string]: Role } = {
  admin: 'ADMIN',
  fitPartner: 'FIT_PARTNER',
  partner: 'PARTNER',
  user: 'USER'
};

export const ALLOWED_SESSION_ROLES: { [id: string]: Role[] } = {
  [ROLES.admin]: [ROLES.user, ROLES.partner, ROLES.admin],
  [ROLES.user]: [ROLES.user],
  // Important: Partners cannot log in as a regular user!
  [ROLES.partner]: [ROLES.partner],
  [ROLES.fitPartner]: [ROLES.user, ROLES.fitPartner]
};

export default interface User {
  birthday: string | null;
  createdAt: Date;
  email: string | null;
  id: string;
  lastAcceptedDesignerTermsAt: Date | null;
  lastAcceptedPartnerTermsAt: Date | null;
  name: string;
  isSmsPreregistration: boolean;
  subscriptionWaivedAt: Date | null;
  phone: string | null;
  referralCode: string;
  role: Role;
}

export interface UserWithPasswordHash extends User {
  passwordHash: string | null;
}

export const baseUser = {
  birthday: null,
  email: null,
  isSmsPreregistration: false,
  subscriptionWaivedAt: null,
  lastAcceptedDesignerTermsAt: null,
  lastAcceptedPartnerTermsAt: null,
  phone: null,
  referralCode: 'n/a',
  role: ROLES.user
};

export interface UserIO extends Partial<Omit<User, 'createdAt' | 'id'>> {
  name: string;
  email: string;
  password: string;
}

export interface UserRow {
  birthday: string | null;
  created_at: string;
  email: string | null;
  id: string;
  last_accepted_designer_terms_at: string | null;
  last_accepted_partner_terms_at: string | null;
  name: string;
  password_hash: string | null;
  is_sms_preregistration: boolean;
  subscription_waived_at: string | null;
  phone: string | null;
  referral_code: string;
  role: Role;
}

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
    name: data.name,
    phone: data.phone,
    referral_code: data.referralCode,
    role: data.role
  };
}

export function passwordHashDecode(data: UserWithPasswordHash): UserRow {
  return {
    birthday: data.birthday,
    created_at: data.createdAt.toISOString(),
    email: data.email,
    id: data.id,
    is_sms_preregistration: data.isSmsPreregistration,
    subscription_waived_at: toDateStringOrNull(data.subscriptionWaivedAt),
    last_accepted_designer_terms_at: toDateStringOrNull(
      data.lastAcceptedDesignerTermsAt
    ),
    last_accepted_partner_terms_at: toDateStringOrNull(
      data.lastAcceptedPartnerTermsAt
    ),
    name: data.name,
    password_hash: data.passwordHash,
    phone: data.phone,
    referral_code: data.referralCode,
    role: data.role
  };
}

export function passwordHashEncode(row: UserRow): UserWithPasswordHash {
  return {
    birthday: row.birthday,
    createdAt: new Date(row.created_at),
    email: row.email,
    id: row.id,
    isSmsPreregistration: row.is_sms_preregistration,
    subscriptionWaivedAt: toDateOrNull(row.subscription_waived_at),
    lastAcceptedDesignerTermsAt: toDateOrNull(
      row.last_accepted_designer_terms_at
    ),
    lastAcceptedPartnerTermsAt: toDateOrNull(
      row.last_accepted_partner_terms_at
    ),
    name: row.name,
    passwordHash: row.password_hash,
    phone: row.phone,
    referralCode: row.referral_code,
    role: row.role
  };
}

export function encode(row: UserRow): User {
  return {
    birthday: row.birthday,
    createdAt: new Date(row.created_at),
    email: row.email,
    id: row.id,
    isSmsPreregistration: row.is_sms_preregistration,
    subscriptionWaivedAt: toDateOrNull(row.subscription_waived_at),
    lastAcceptedDesignerTermsAt: toDateOrNull(
      row.last_accepted_designer_terms_at
    ),
    lastAcceptedPartnerTermsAt: toDateOrNull(
      row.last_accepted_partner_terms_at
    ),
    name: row.name,
    phone: row.phone,
    referralCode: row.referral_code,
    role: row.role
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
    'created_at',
    'email',
    'id',
    'name',
    'password_hash',
    'is_sms_preregistration',
    'phone',
    'referral_code',
    'role'
  );
}

export function isUserIO(data: object): data is UserIO {
  return hasProperties(data, 'email', 'name', 'password', 'phone');
}
