import { Role as TeamUserRole } from "../team-users/types";

export enum TeamType {
  DESIGNER = "DESIGNER",
  PARTNER = "PARTNER",
}

export function isTeamType(candidate: any): candidate is TeamType {
  return Object.values(TeamType).includes(candidate);
}

export interface TeamDb {
  id: string;
  title: string;
  createdAt: Date;
  deletedAt: Date | null;
  type: TeamType;
}

export interface TeamDbRow {
  id: string;
  title: string;
  created_at: Date;
  deleted_at: Date | null;
  type: TeamType;
}

export interface Team extends TeamDb {
  role: TeamUserRole;
}

export interface TeamRow extends TeamDbRow {
  role: TeamUserRole;
}

export function isUnsavedTeam(
  candidate: Record<string, any>
): candidate is Omit<TeamDb, "id" | "createdAt" | "deletedAt"> {
  const keyset = new Set(Object.keys(candidate));

  return ["title"].every(keyset.has.bind(keyset));
}
