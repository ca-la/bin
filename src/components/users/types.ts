export type Role = "ADMIN" | "FIT_PARTNER" | "PARTNER" | "USER";

export const ROLES: { [id: string]: Role } = {
  admin: "ADMIN",
  fitPartner: "FIT_PARTNER",
  partner: "PARTNER",
  user: "USER",
};

export const ALLOWED_SESSION_ROLES: { [id: string]: Role[] } = {
  [ROLES.admin]: [ROLES.user, ROLES.partner, ROLES.admin],
  [ROLES.user]: [ROLES.user],
  // Important: Partners cannot log in as a regular user!
  [ROLES.partner]: [ROLES.partner],
  [ROLES.fitPartner]: [ROLES.user, ROLES.fitPartner],
};

export default interface User {
  birthday: string | null;
  createdAt: Date;
  email: string | null;
  id: string;
  isSmsPreregistration: boolean;
  lastAcceptedDesignerTermsAt: Date | null;
  lastAcceptedPartnerTermsAt: Date | null;
  locale: string;
  name: string | null;
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
  lastAcceptedDesignerTermsAt: null,
  lastAcceptedPartnerTermsAt: null,
  locale: "en",
  phone: null,
  referralCode: "n/a",
  role: ROLES.user,
};

export interface UserIO extends Partial<Omit<User, "createdAt" | "id">> {
  email: string;
  name: string | null;
  password: string | null;
}

export interface UserRow {
  birthday: string | null;
  created_at: string;
  email: string | null;
  id: string;
  is_sms_preregistration: boolean;
  last_accepted_designer_terms_at: string | null;
  last_accepted_partner_terms_at: string | null;
  locale: string;
  name: string | null;
  password_hash: string | null;
  phone: string | null;
  referral_code: string;
  role: Role;
}
