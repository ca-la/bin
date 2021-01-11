import {
  RealtimeMessage,
  isRealtimeMessage,
  RealtimeMessageType,
} from "../iris/types";
import { buildChannelName } from "../iris/build-channel";

import { TeamUser } from "./types";
import { Serialized } from "../../types/serialized";

export interface RealtimeTeamUsersListUpdated extends RealtimeMessage {
  resource: TeamUser[];
  type: RealtimeMessageType.teamUsersListUpdated;
}

export function isRealtimeTeamUsersListUpdated(
  data: any
): data is Serialized<RealtimeTeamUsersListUpdated> {
  return (
    isRealtimeMessage(data) &&
    data.type === RealtimeMessageType.teamUsersListUpdated
  );
}

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
