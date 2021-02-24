import * as z from "zod";
import {
  dateStringToDate,
  nullableDateStringToNullableDate,
} from "../../services/zod-helpers";

export const userRoleSchema = z.enum([
  "ADMIN",
  "FIT_PARTNER",
  "PARTNER",
  "USER",
]);
export type Role = z.infer<typeof userRoleSchema>;

export const ROLES = userRoleSchema.enum;

export const ALLOWED_SESSION_ROLES: { [id: string]: Role[] } = {
  [ROLES.ADMIN]: [ROLES.USER, ROLES.PARTNER, ROLES.ADMIN],
  [ROLES.USER]: [ROLES.USER],
  // Important: Partners cannot log in as a regular user!
  [ROLES.PARTNER]: [ROLES.PARTNER],
  [ROLES.FIT_PARTNER]: [ROLES.USER, ROLES.FIT_PARTNER],
};

export const userSchema = z.object({
  birthday: z.string().nullable(),
  createdAt: z.date(),
  email: z.string().nullable(),
  id: z.string(),
  isSmsPreregistration: z.boolean(),
  lastAcceptedDesignerTermsAt: z.date().nullable(),
  lastAcceptedPartnerTermsAt: z.date().nullable(),
  locale: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  referralCode: z.string(),
  role: userRoleSchema,
});
export type User = z.infer<typeof userSchema>;

export const serializedUserSchema = userSchema.extend({
  createdAt: dateStringToDate,
  lastAcceptedDesignerTermsAt: nullableDateStringToNullableDate,
  lastAcceptedPartnerTermsAt: nullableDateStringToNullableDate,
});

export default User;

export interface UserWithPasswordHash extends User {
  passwordHash: string | null;
}

export const baseUser: Omit<User, "createdAt" | "id" | "name"> = {
  birthday: null,
  email: null,
  isSmsPreregistration: false,
  lastAcceptedDesignerTermsAt: null,
  lastAcceptedPartnerTermsAt: null,
  locale: "en",
  phone: null,
  referralCode: "n/a",
  role: ROLES.USER,
};

export const userIoSchema = userSchema
  .omit({
    createdAt: true,
    id: true,
  })
  .partial()
  .extend({
    email: z.string(),
    name: z.string().nullable(),
    password: z.string().nullable(),
  });
export type UserIO = z.infer<typeof userIoSchema>;

export const userRowSchema = z.object({
  birthday: z.string().nullable(),
  created_at: z.string(),
  email: z.string().nullable(),
  id: z.string(),
  is_sms_preregistration: z.boolean(),
  last_accepted_designer_terms_at: z.string().nullable(),
  last_accepted_partner_terms_at: z.string().nullable(),
  locale: z.string(),
  name: z.string().nullable(),
  password_hash: z.string().nullable(),
  phone: z.string().nullable(),
  referral_code: z.string(),
  role: userRoleSchema,
});
export type UserRow = z.infer<typeof userRowSchema>;

export const serializedUserRowSchema = userRowSchema.extend({
  created_at: dateStringToDate,
  last_accepted_designer_terms_at: nullableDateStringToNullableDate,
  last_accepted_partner_terms_at: nullableDateStringToNullableDate,
});

export const userTestBlank: User = {
  birthday: null,
  createdAt: new Date(),
  email: "test@example.com",
  id: "user-id",
  isSmsPreregistration: false,
  lastAcceptedDesignerTermsAt: null,
  lastAcceptedPartnerTermsAt: null,
  locale: "en-us",
  name: "User",
  phone: null,
  referralCode: "",
  role: "USER",
};
