import { z } from "zod";
import { RealtimeMessageType, realtimeMessageSchema } from "../iris/types";
import { buildChannelName } from "../iris/build-channel";

import {
  invitedTeamUserSchema,
  registeredTeamUserSchema,
  TeamUser,
  teamUserSchema,
} from "./types";
import { Team, teamSchema } from "../teams/types";
import {
  dateStringToDate,
  nullableDateStringToNullableDate,
} from "../../services/zod-helpers";

const realtimeTeamUsersListUpdatedSchema = realtimeMessageSchema.extend({
  resource: z.array(teamUserSchema),
  type: z.literal(RealtimeMessageType.teamUsersListUpdated),
});
export type RealtimeTeamUsersListUpdated = z.infer<
  typeof realtimeTeamUsersListUpdatedSchema
>;

const dateTransformed = {
  createdAt: dateStringToDate,
  updatedAt: dateStringToDate,
  deletedAt: nullableDateStringToNullableDate,
};

export const serializedRealtimeTeamUsersListUpdatedSchema = realtimeTeamUsersListUpdatedSchema.extend(
  {
    resource: z.array(
      z.union([
        registeredTeamUserSchema.extend(dateTransformed),
        invitedTeamUserSchema.extend(dateTransformed),
      ])
    ),
  }
);
export type SerializedRealtimeTeamUsersListUpdated = z.input<
  typeof serializedRealtimeTeamUsersListUpdatedSchema
>;

export function realtimeTeamUsersListUpdated(
  teamId: string,
  teamUsersList: TeamUser[]
): RealtimeTeamUsersListUpdated {
  return {
    type: RealtimeMessageType.teamUsersListUpdated,
    resource: teamUsersList,
    channels: [buildChannelName("teams", teamId)],
  };
}

const realtimeTeamInvitedSchema = realtimeMessageSchema.extend({
  resource: teamSchema,
  type: z.literal(RealtimeMessageType.teamInvited),
});
export type RealtimeTeamInvited = z.infer<typeof realtimeTeamInvitedSchema>;

export const serializedTeamInvitedSchema = realtimeTeamInvitedSchema.extend({
  resource: teamSchema.extend({
    createdAt: dateStringToDate,
    deletedAt: nullableDateStringToNullableDate,
  }),
});
export type SerializedTeamInvited = z.output<
  typeof serializedTeamInvitedSchema
>;

export function realtimeTeamInvited(
  userId: string,
  team: Team
): RealtimeTeamInvited {
  return {
    type: RealtimeMessageType.teamInvited,
    resource: team,
    channels: [buildChannelName("updates", userId)],
  };
}
