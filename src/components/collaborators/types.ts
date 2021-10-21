import * as z from "zod";
import { check } from "../../services/check";
import { userRowSchema, userSchema } from "../users/types";

export const rolesSchema = z.enum([
  "OWNER",
  "EDIT",
  "VIEW",
  "PARTNER",
  "PREVIEW",
]);
export type Roles = z.infer<typeof rolesSchema>;
export const CollaboratorRoles = rolesSchema.enum;

export const COLLABORATOR_ROLES: Roles[] = rolesSchema.options;

export function isRole(role: string): role is Roles {
  return check(rolesSchema, role);
}

export enum CollaboratorRole {
  CALA = "CALA",
  DESIGNER = "DESIGNER",
  PARTNER = "PARTNER",
}

export const collaboratorSchema = z.object({
  id: z.string(),
  collectionId: z.string().nullable(),
  designId: z.string().nullable(),
  userId: z.string().nullable(),
  userEmail: z.string().nullable(),
  invitationMessage: z.string().nullable(),
  role: rolesSchema,
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  teamId: z.string().nullable(),
});
export type Collaborator = z.infer<typeof collaboratorSchema>;
export default Collaborator;

export const collaboratorWithUserSchema = collaboratorSchema.extend({
  user: userSchema.nullable(),
});
export type CollaboratorWithUser = z.infer<typeof collaboratorWithUserSchema>;

export const collaboratorRowSchema = z.object({
  id: z.string(),
  collection_id: z.string().nullable(),
  design_id: z.string().nullable(),
  user_id: z.string().nullable(),
  user_email: z.string().nullable(),
  invitation_message: z.string().nullable(),
  role: rolesSchema,
  created_at: z.date(),
  deleted_at: z.date().nullable(),
  cancelled_at: z.date().nullable(),
  team_id: z.string().nullable(),
});
export type CollaboratorRow = z.infer<typeof collaboratorRowSchema>;

export const collaboratorUserRowSchema = collaboratorRowSchema.extend({
  user: userRowSchema.nullable(),
});
export type CollaboratorWithUserRow = z.infer<typeof collaboratorUserRowSchema>;
