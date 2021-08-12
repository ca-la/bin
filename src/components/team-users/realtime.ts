import { z } from "zod";
import { buildChannelName } from "../iris/build-channel";

import { serializedTeamUserSchema, TeamUser } from "./types";
import { serializedTeamSchema, Team } from "../teams/types";

export const realtimeTeamUsersListUpdatedSchema = z.object({
  channels: z.tuple([z.string()]),
  resource: z.array(serializedTeamUserSchema),
  type: z.literal("team-users-list/updated"),
});
export type RealtimeTeamUsersListUpdated = z.infer<
  typeof realtimeTeamUsersListUpdatedSchema
>;

export function realtimeTeamUsersListUpdated(
  teamId: string,
  teamUsersList: TeamUser[]
): RealtimeTeamUsersListUpdated {
  return {
    type: "team-users-list/updated",
    resource: teamUsersList,
    channels: [buildChannelName("teams", teamId)],
  };
}

export const realtimeTeamListUpdatedSchema = z.object({
  channels: z.tuple([z.string()]),
  resource: z.array(serializedTeamSchema),
  type: z.literal("team-list/updated"),
});
export type RealtimeTeamListUpdated = z.infer<
  typeof realtimeTeamListUpdatedSchema
>;

export function realtimeTeamListUpdated(
  userId: string,
  teams: Team[]
): RealtimeTeamListUpdated {
  return {
    type: "team-list/updated",
    resource: teams,
    channels: [buildChannelName("updates", userId)],
  };
}
