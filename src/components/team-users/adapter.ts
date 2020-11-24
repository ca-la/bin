import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { dataAdapter as userAdapter } from "../users/domain-object";
import {
  TeamUserDb,
  TeamUserDbRow,
  TeamUserRow,
  TeamUser,
  isRegisteredTeamUser,
  isRegisteredTeamUserRow,
  isRegisteredTeamUserDb,
  isRegisteredTeamUserDbRow,
} from "./types";

function rawEncode(row: TeamUserDbRow): TeamUserDb {
  const encoded = {
    id: row.id,
    teamId: row.team_id,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };

  if (isRegisteredTeamUserDbRow(row)) {
    return { ...encoded, userId: row.user_id, userEmail: null };
  }

  return { ...encoded, userId: null, userEmail: row.user_email };
}

function encode(row: TeamUserRow): TeamUser {
  const rawEncoded = rawEncode(row);

  if (isRegisteredTeamUserRow(row)) {
    return {
      ...rawEncoded,
      userId: row.user_id,
      userEmail: null,
      user: userAdapter.parse(row.user),
    };
  }

  return {
    ...rawEncoded,
    userId: null,
    userEmail: row.user_email,
    user: null,
  };
}

function rawDecode(data: TeamUserDb): TeamUserDbRow {
  const decoded = {
    id: data.id,
    user_id: data.userId,
    user_email: data.userEmail,
    team_id: data.teamId,
    role: data.role,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
    deleted_at: data.deletedAt,
  };

  if (isRegisteredTeamUserDb(data)) {
    return {
      ...decoded,
      user_id: data.userId,
      user_email: null,
    };
  }

  return {
    ...decoded,
    user_id: null,
    user_email: data.userEmail,
  };
}

function decode(data: TeamUser): TeamUserRow {
  const rawDecoded = rawDecode(data);

  if (isRegisteredTeamUser(data)) {
    return {
      ...rawDecoded,
      user_id: data.userId,
      user_email: null,
      user: userAdapter.toDb(data.user),
    };
  }

  return {
    ...rawDecoded,
    user_id: null,
    user_email: data.userEmail,
    user: null,
  };
}

export const rawAdapter = buildAdapter({
  domain: "TeamUserDb" as const,
  encodeTransformer: rawEncode,
  decodeTransformer: rawDecode,
  requiredProperties: ["id", "teamId", "userId", "userEmail", "role"],
});

export default buildAdapter({
  domain: "TeamUser" as const,
  encodeTransformer: encode,
  decodeTransformer: decode,
  requiredProperties: ["id", "teamId", "userId", "userEmail", "role", "user"],
});
