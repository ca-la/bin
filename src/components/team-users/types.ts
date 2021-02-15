import User, { UserRow } from "../users/types";
import { Roles } from "../collaborators/types";

export const teamUserDomain = "TeamUser" as "TeamUser";
export const rawTeamUserDomain = "TeamUserDb" as "TeamUserDb";

export enum Role {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER",
}

export const TEAM_USER_ROLE_TO_COLLABORATOR_ROLE: Record<Role, Roles> = {
  [Role.OWNER]: "EDIT",
  [Role.ADMIN]: "EDIT",
  [Role.EDITOR]: "EDIT",
  [Role.VIEWER]: "VIEW",
};

export const TEAM_ROLE_PERMISSIVENESS: Record<Role, number> = {
  [Role.VIEWER]: 1,
  [Role.EDITOR]: 2,
  [Role.ADMIN]: 3,
  [Role.OWNER]: 4,
};

export const PARTNER_TEAM_BID_PREVIEWERS: Role[] = [Role.OWNER, Role.ADMIN];
export const PARTNER_TEAM_BID_EDITORS: Role[] = [
  Role.OWNER,
  Role.ADMIN,
  Role.EDITOR,
];

export interface BaseTeamUserDb {
  id: string;
  teamId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface BaseTeamUserDbRow {
  id: string;
  team_id: string;
  role: Role;
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

export interface UnsavedTeamUser {
  teamId: string;
  userEmail: string;
  role: Role;
}

export function isUnsavedTeamUser(
  candidate: Record<string, any>
): candidate is UnsavedTeamUser {
  const keyset = new Set(Object.keys(candidate));
  const roleset = new Set(Object.values(Role));

  return (
    ["teamId", "userEmail", "role"].every(keyset.has.bind(keyset)) &&
    roleset.has(candidate.role)
  );
}

export function isTeamUserRole(candidate: any): candidate is Role {
  return Object.values(Role).includes(candidate);
}

export interface TeamUserUpdate {
  role: Role;
}

const allowedUpdateRows: (keyof TeamUserUpdate)[] = ["role"];

export const isTeamUserUpdate = (data: any): data is TeamUserUpdate => {
  return (
    Object.keys(data).length === allowedUpdateRows.length &&
    allowedUpdateRows.every(
      (key: keyof TeamUserUpdate) => data[key] !== undefined
    )
  );
};
