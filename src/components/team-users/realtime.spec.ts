import { test, Test } from "../../test-helpers/simple";
import { RealtimeMessageType } from "../iris/types";
import { teamTestBlank } from "../teams/types";

import {
  serializedRealtimeTeamUsersListUpdatedSchema,
  SerializedRealtimeTeamUsersListUpdated,
  serializedTeamInvitedSchema,
  SerializedTeamInvited,
} from "./realtime";
import { teamUserTestBlank } from "./types";

test("serializedTeamInvitedSchema: valid", (t: Test) => {
  const serialized: SerializedRealtimeTeamUsersListUpdated = {
    channels: ["a-channel"],
    resource: [JSON.parse(JSON.stringify(teamUserTestBlank))],
    type: RealtimeMessageType.teamUsersListUpdated,
  };

  const parsed = serializedRealtimeTeamUsersListUpdatedSchema.parse(serialized);

  t.deepEqual(
    parsed,
    {
      ...serialized,
      resource: [teamUserTestBlank],
    },
    "deserializes the embedded resource"
  );
});

test("serializedTeamInvited: valid", (t: Test) => {
  const serialized: SerializedTeamInvited = {
    channels: ["a-channel"],
    resource: JSON.parse(JSON.stringify(teamTestBlank)),
    type: RealtimeMessageType.teamInvited,
  };

  const parsed = serializedTeamInvitedSchema.parse(serialized);

  t.deepEqual(
    parsed,
    {
      ...serialized,
      resource: teamTestBlank,
    },
    "deserializes the embedded resource"
  );
});
