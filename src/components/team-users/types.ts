import { z } from "zod";

import {
  serializedUserRowSchema,
  serializedUserSchema,
  userTestBlank,
} from "../users/types";
import { Roles } from "../collaborators/types";
import { check } from "../../services/check";

export const teamUserDomain = "TeamUser" as "TeamUser";
export const rawTeamUserDomain = "TeamUserDb" as "TeamUserDb";

export enum Role {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER",
  TEAM_PARTNER = "TEAM_PARTNER",
}
export const roleSchema = z.nativeEnum(Role);

export const TEAM_USER_ROLE_TO_COLLABORATOR_ROLE: Record<Role, Roles> = {
  [Role.OWNER]: "EDIT",
  [Role.ADMIN]: "EDIT",
  [Role.EDITOR]: "EDIT",
  [Role.VIEWER]: "VIEW",
  [Role.TEAM_PARTNER]: "PARTNER",
};

export const TEAM_ROLE_PERMISSIVENESS: Record<Role, number> = {
  [Role.VIEWER]: 1,
  [Role.EDITOR]: 2,
  [Role.TEAM_PARTNER]: 2,
  [Role.ADMIN]: 3,
  [Role.OWNER]: 4,
};

export const PARTNER_TEAM_BID_PREVIEWERS: Role[] = [Role.OWNER, Role.ADMIN];
export const PARTNER_TEAM_BID_EDITORS: Role[] = [
  Role.OWNER,
  Role.ADMIN,
  Role.EDITOR,
];

export const FREE_TEAM_USER_ROLES: Role[] = [Role.VIEWER, Role.TEAM_PARTNER];

const baseDb = {
  id: z.string(),
  teamId: z.string(),
  role: roleSchema,
  label: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
};

export const registeredDbSchema = z.object({
  ...baseDb,
  userId: z.string(),
  userEmail: z.null(),
});
export const registeredDbRowSchema = z.object({
  id: registeredDbSchema.shape.id,
  team_id: registeredDbSchema.shape.teamId,
  role: registeredDbSchema.shape.role,
  label: registeredDbSchema.shape.label,
  created_at: registeredDbSchema.shape.createdAt,
  updated_at: registeredDbSchema.shape.updatedAt,
  deleted_at: registeredDbSchema.shape.deletedAt,
  user_id: registeredDbSchema.shape.userId,
  user_email: registeredDbSchema.shape.userEmail,
});

export const invitedDbSchema = z.object({
  ...baseDb,
  userId: z.null(),
  userEmail: z.string(),
});
export const invitedDbRowSchema = z.object({
  id: invitedDbSchema.shape.id,
  team_id: invitedDbSchema.shape.teamId,
  role: invitedDbSchema.shape.role,
  label: invitedDbSchema.shape.label,
  created_at: invitedDbSchema.shape.createdAt,
  updated_at: invitedDbSchema.shape.updatedAt,
  deleted_at: invitedDbSchema.shape.deletedAt,
  user_id: invitedDbSchema.shape.userId,
  user_email: invitedDbSchema.shape.userEmail,
});

export const teamUserDbSchema = z.union([invitedDbSchema, registeredDbSchema]);
export type TeamUserDb = z.infer<typeof teamUserDbSchema>;

export const teamUserDbRowSchema = z.union([
  invitedDbRowSchema,
  registeredDbRowSchema,
]);
export type TeamUserDbRow = z.infer<typeof teamUserDbRowSchema>;

export const registeredTeamUserSchema = registeredDbSchema.extend({
  user: serializedUserSchema,
});
type RegisteredTeamUser = z.infer<typeof registeredTeamUserSchema>;

export const invitedTeamUserSchema = invitedDbSchema.extend({
  user: z.null(),
});

const registeredTeamUserRowSchema = registeredDbRowSchema.extend({
  user: serializedUserRowSchema,
});
type RegisteredTeamUserRow = z.infer<typeof registeredTeamUserRowSchema>;

const invitedTeamUserRowSchema = invitedDbRowSchema.extend({
  user: z.null(),
});

export const teamUserSchema = z.union([
  registeredTeamUserSchema,
  invitedTeamUserSchema,
]);
export type TeamUser = z.infer<typeof teamUserSchema>;

export const teamUserRowSchema = z.union([
  registeredTeamUserRowSchema,
  invitedTeamUserRowSchema,
]);
export type TeamUserRow = z.infer<typeof teamUserRowSchema>;

export function isRegisteredTeamUser(
  candidate: TeamUser
): candidate is RegisteredTeamUser {
  return candidate.user !== null;
}

export function isRegisteredTeamUserRow(
  candidate: TeamUserRow
): candidate is RegisteredTeamUserRow {
  return candidate.user !== null;
}

export const unsavedTeamUserSchema = z.object({
  teamId: z.string(),
  userEmail: z.string(),
  role: roleSchema,
});
export type UnsavedTeamUser = z.infer<typeof unsavedTeamUserSchema>;

export const isUnsavedTeamUser = (
  candidate: unknown
): candidate is UnsavedTeamUser => check(unsavedTeamUserSchema, candidate);

export const isTeamUserRole = (candidate: any): candidate is Role =>
  check(roleSchema, candidate);

export const teamUserUpdateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const teamUserUpdateLabelSchema = z.object({
  label: z.string().nullable(),
});

export const teamUserUpdateSchema = z.union([
  teamUserUpdateRoleSchema.strict(),
  teamUserUpdateLabelSchema.strict(),
]);

export type TeamUserUpdate = z.infer<typeof teamUserUpdateSchema>;

export const teamUserDbTestBlank: TeamUserDb = {
  id: "team-user-1",
  teamId: "team-1",
  role: Role.VIEWER,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  label: null,
  userId: userTestBlank.id,
  userEmail: null,
};

export const teamUserTestBlank: TeamUser = {
  ...teamUserDbTestBlank,
  user: userTestBlank,
};
