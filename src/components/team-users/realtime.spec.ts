import { test, Test } from "../../test-helpers/simple";
import { RealtimeMessageType } from "../iris/types";
import { teamTestBlank } from "../teams/types";

import {
  serializedRealtimeTeamUsersListUpdatedSchema,
  SerializedRealtimeTeamUsersListUpdated,
  serializedRealtimeTeamListUpdatedSchema,
  SerializedRealtimeTeamListUpdated,
} from "./realtime";
import { teamUserTestBlank } from "./types";

test("serializedRealtimeTeamUsersListUpdatedSchema: valid", (t: Test) => {
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

test("serializedTealtimeTeamListUpdatedSchema: valid", (t: Test) => {
  const serialized: SerializedRealtimeTeamListUpdated = {
    channels: ["a-channel"],
    resource: JSON.parse(JSON.stringify([teamTestBlank])),
    type: RealtimeMessageType.teamListUpdated,
  };

  const parsed = serializedRealtimeTeamListUpdatedSchema.parse(serialized);

  t.deepEqual(
    parsed,
    {
      ...serialized,
      resource: [teamTestBlank],
    },
    "deserializes the embedded resource"
  );
});
