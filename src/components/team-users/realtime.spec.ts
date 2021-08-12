import { test, Test } from "../../test-helpers/simple";
import { teamTestBlank } from "../teams/types";

import {
  realtimeTeamUsersListUpdatedSchema,
  realtimeTeamListUpdatedSchema,
} from "./realtime";
import { teamUserTestBlank } from "./types";

test("serializedRealtimeTeamUsersListUpdatedSchema: valid", (t: Test) => {
  const serialized = {
    channels: ["a-channel"],
    resource: [JSON.parse(JSON.stringify(teamUserTestBlank))],
    type: "team-users-list/updated",
  };

  const parsed = realtimeTeamUsersListUpdatedSchema.parse(serialized);

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
  const serialized = {
    channels: ["a-channel"],
    resource: JSON.parse(JSON.stringify([teamTestBlank])),
    type: "team-list/updated",
  };

  const parsed = realtimeTeamListUpdatedSchema.parse(serialized);

  t.deepEqual(
    parsed,
    {
      ...serialized,
      resource: [teamTestBlank],
    },
    "deserializes the embedded resource"
  );
});
