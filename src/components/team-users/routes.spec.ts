import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, post } from "../../test-helpers/http";

import SessionsDAO from "../../dao/sessions";
import TeamUsersDAO from "./dao";
import { Role, TeamUser } from "./types";

function setup() {
  const now = new Date();
  sandbox().useFakeTimers(now);
  sandbox().stub(uuid, "v4").returns("a-team-user-id");
  const tu1: TeamUser = {
    id: "a-team-user-id",
    teamId: "a-team-id",
    userId: "a-user-id",
    role: Role.ADMIN,
  };
  return {
    sessionsStub: sandbox().stub(SessionsDAO, "findById").resolves({
      role: "USER",
      userId: "a-user-id",
    }),
    createStub: sandbox().stub(TeamUsersDAO, "create").resolves(tu1),
    teamUsers: [tu1],
    now,
  };
}

test("POST /team-users", async (t: Test) => {
  const {
    createStub,
    sessionsStub,
    teamUsers: [tu1],
  } = setup();

  const [response, body] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userId: "a-user-id",
      role: "ADMIN",
    },
  });

  t.equal(response.status, 201);
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify(tu1)),
    "returns the created team from the DAO"
  );
  t.deepEqual(
    createStub.args[0][1],
    tu1,
    "calls create with the correct values"
  );

  const [invalid] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userId: "a-user-id",
      role: "NOT A VALID ROLE!",
    },
  });

  t.equal(invalid.status, 400, "Requires a valid role");

  sessionsStub.resolves(null);

  const [unauthenticated] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userId: "a-user-id",
      role: "ADMIN",
    },
  });

  t.equal(unauthenticated.status, 401, "Does not allow unauthenticated users");
});
