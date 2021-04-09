import * as z from "zod";

import User, { UserRow, userTestBlank } from "../users/types";
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

export interface BaseTeamUserDb {
  id: string;
  teamId: string;
  role: Role;
  label: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface BaseTeamUserDbRow {
  id: string;
  team_id: string;
  role: Role;
  label: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface Registered extends BaseTeamUserDb {
  userId: string;
  userEmail: null;
}

interface RegisteredRow extends BaseTeamUserDbRow {
  user_id: string;
  user_email: null;
}

interface Invited extends BaseTeamUserDb {
  userId: null;
  userEmail: string;
}

interface InvitedRow extends BaseTeamUserDbRow {
  user_id: null;
  user_email: string;
}

export type TeamUserDb = Registered | Invited;

export type TeamUserDbRow = RegisteredRow | InvitedRow;

export function isRegisteredTeamUserDb(
  candidate: TeamUserDb
): candidate is Registered {
  return candidate.userId !== null;
}

export function isRegisteredTeamUserDbRow(
  candidate: TeamUserDbRow
): candidate is RegisteredRow {
  return candidate.user_id !== null;
}

interface RegisteredTeamUser extends Registered {
  user: User;
}

interface InvitedTeamUser extends Invited {
  user: null;
}

interface RegisteredTeamUserRow extends RegisteredRow {
  user: UserRow;
}

interface InvitedTeamUserRow extends InvitedRow {
  user: null;
}

export type TeamUser = RegisteredTeamUser | InvitedTeamUser;

export type TeamUserRow = RegisteredTeamUserRow | InvitedTeamUserRow;

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

export const teamUserDbTestBlank: BaseTeamUserDb = {
  id: "team-user-1",
  teamId: "team-1",
  role: Role.VIEWER,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  label: null,
};

export const teamUserTestBlank: TeamUser = {
  ...teamUserDbTestBlank,
  userId: userTestBlank.id,
  userEmail: null,
  user: userTestBlank,
};
