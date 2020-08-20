export enum Role {
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER",
}

export interface TeamUser {
  id: string;
  teamId: string;
  userId: string;
  role: Role;
}

export interface TeamUserRow {
  id: string;
  team_id: string;
  user_id: string;
  role: Role;
}

export function isUnsavedTeamUser(
  candidate: Record<string, any>
): candidate is Omit<TeamUser, "id" | "createdAt" | "deletedAt"> {
  const keyset = new Set(Object.keys(candidate));
  const roleset = new Set(Object.values(Role));

  return (
    ["teamId", "userId", "role"].every(keyset.has.bind(keyset)) &&
    roleset.has(candidate.role)
  );
}
