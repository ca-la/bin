import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, post } from "../../test-helpers/http";

import * as UsersDAO from "../users/dao";
import SessionsDAO from "../../dao/sessions";
import TeamUsersDAO from "./dao";
import { Role, TeamUser } from "./types";
import ResourceNotFoundError from "../../errors/resource-not-found";
import { TeamUserRole } from "../../published-types";

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
    findUserStub: sandbox().stub(UsersDAO, "findByEmail").resolves({
      id: "a-user-id",
    }),
    findActorTeamUserStub: sandbox().stub(TeamUsersDAO, "findOne").resolves({
      role: TeamUserRole.ADMIN,
    }),
    createStub: sandbox().stub(TeamUsersDAO, "create").resolves(tu1),
    teamUsers: [tu1],
    now,
  };
}

test("POST /team-users: valid", async (t: Test) => {
  const {
    createStub,
    teamUsers: [tu1],
  } = setup();

  const [response, body] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "ADMIN",
    },
  });

  t.equal(response.status, 201);
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify(tu1)),
    "returns the created team user from the DAO"
  );
  t.deepEqual(
    createStub.args[0][1],
    tu1,
    "calls create with the correct values"
  );
});

test("POST /team-users: invalid", async (t: Test) => {
  setup();

  const [invalid] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "NOT A VALID ROLE!",
    },
  });

  t.equal(invalid.status, 400, "Requires a valid role");
});

test("POST /teams-user: unauthenticated", async (t: Test) => {
  const { sessionsStub } = setup();

  sessionsStub.resolves(null);

  const [unauthenticated] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "ADMIN",
    },
  });

  t.equal(unauthenticated.status, 401, "Does not allow unauthenticated users");
});

test("POST /team-users: missingUser", async (t: Test) => {
  const { findUserStub } = setup();

  findUserStub.rejects(
    new ResourceNotFoundError(
      "Could not find user with email: teammate@example.com"
    )
  );
  const [missingUser] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "EDITOR",
    },
  });

  t.equal(
    missingUser.status,
    404,
    "Returns not found response when user is missing"
  );
});

test("POST /team-users: forbidden", async (t: Test) => {
  const { findActorTeamUserStub } = setup();

  findActorTeamUserStub.resolves(null);
  const [notAMember] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "VIEWER",
    },
  });
  t.equal(
    notAMember.status,
    403,
    "Returns Forbidden status when you're not a member of the team"
  );

  findActorTeamUserStub.resolves({
    role: TeamUserRole.VIEWER,
  });
  const [viewer] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "VIEWER",
    },
  });
  t.equal(viewer.status, 403, "Returns Forbidden status when you're a viewer");

  findActorTeamUserStub.resolves({
    role: TeamUserRole.EDITOR,
  });
  const [editorMakesAdmin] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "ADMIN",
    },
  });
  t.equal(
    editorMakesAdmin.status,
    403,
    "Returns Forbidden status when you're an editor trying to make an admin"
  );
});
