import User, { UserRow } from "../users/types";

export enum Role {
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER",
}

export type TeamUserDb = {
  id: string;
  teamId: string;
  role: Role;
} & (
  | {
      userId: null;
      userEmail: string;
    }
  | {
      userId: string;
      userEmail: null;
    }
);

export type TeamUserDbRow = {
  id: string;
  team_id: string;
  role: Role;
} & (
  | {
      user_email: null;
      user_id: string;
    }
  | {
      user_id: null;
      user_email: string;
    }
);

export type TeamUser = TeamUserDb &
  (
    | {
        // a partial constraint; "either userId and user are both present, or neither are"
        userId: string;
        user: User;
      }
    | {
        userId: null;
        user: null;
      }
  );

export function isRegisteredTeamUser(
  candidate: TeamUser
): candidate is TeamUserDb & {
  userId: string;
  user: User;
  userEmail: null;
} {
  return Boolean(candidate.user && candidate.userId && !candidate.userEmail);
}

export type TeamUserRow = TeamUserDbRow &
  (
    | {
        user_id: string;
        user: UserRow;
      }
    | {
        user_id: null;
        user: null;
      }
  );

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
