import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, get, patch, post } from "../../test-helpers/http";
import createUser from "../../test-helpers/create-user";

import db from "../../services/db";
import * as UsersDAO from "../users/dao";
import { baseUser, Role as UserRole } from "../users/domain-object";
import SessionsDAO from "../../dao/sessions";
import { rawDao as RawTeamsDAO } from "../teams/dao";
import TeamUsersDAO, { rawDao as RawTeamUsersDAO } from "./dao";
import { Role, TeamUser, TeamUserDb } from "./types";
import { TeamType, TeamUserRole } from "../../published-types";

const now = new Date();
const tuDb1: TeamUserDb = {
  id: "a-team-user-id",
  teamId: "a-team-id",
  userId: "a-user-id",
  userEmail: null,
  role: Role.ADMIN,
};
const tu1: TeamUser = {
  ...tuDb1,
  user: { ...baseUser, createdAt: now, id: "a-user-id", name: "A User" },
};

function setup({ role = "USER" }: { role?: UserRole } = {}) {
  sandbox().useFakeTimers(now);
  sandbox().stub(uuid, "v4").returns("a-team-user-id");
  return {
    sessionsStub: sandbox().stub(SessionsDAO, "findById").resolves({
      role,
      userId: "a-user-id",
    }),
    findUserStub: sandbox().stub(UsersDAO, "findByEmail").resolves({
      id: "a-user-id",
    }),
    findActorTeamUserStub: sandbox().stub(TeamUsersDAO, "findOne").resolves({
      role: TeamUserRole.ADMIN,
    }),
    findTeamMembersStub: sandbox().stub(TeamUsersDAO, "find").resolves([tu1]),
    createStub: sandbox().stub(RawTeamUsersDAO, "create").resolves(tuDb1),
    findTeamUserByIdStub: sandbox()
      .stub(TeamUsersDAO, "findById")
      .resolves(tu1),
    updateStub: sandbox()
      .stub(TeamUsersDAO, "update")
      .resolves({ before: tu1, updated: tu1 }),
  };
}

test("POST /team-users: valid", async (t: Test) => {
  const { createStub } = setup();

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
    tuDb1,
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

  findUserStub.resolves(null);

  const [response] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "EDITOR",
    },
  });

  t.equal(response.status, 201, "Creates a team user with no user yet");
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

test("GET /team-users?teamId: valid", async (t: Test) => {
  const { findTeamMembersStub } = setup();
  const [response, body] = await get("/team-users?teamId=a-team-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "Responds with success");
  t.deepEqual(body, [JSON.parse(JSON.stringify(tu1))], "Returns TeamUser");
  t.deepEqual(
    findTeamMembersStub.args[0][1],
    { teamId: "a-team-id" },
    "Gets members by team"
  );
});

test("GET /team-users?teamId: unauthenticated", async (t: Test) => {
  const { sessionsStub } = setup();
  sessionsStub.resolves(null);
  const [unauthenticated] = await get("/team-users?teamId=a-team-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(unauthenticated.status, 401, "Responds with unauthenticated");
});

test("GET /team-users?teamId: missing query param", async (t: Test) => {
  setup();
  const [unauthenticated] = await get("/team-users", {
    headers: authHeader("a-session-id"),
  });

  t.equal(unauthenticated.status, 400, "Responds with invalid");
});

test("GET /team-users?teamId: forbidden", async (t: Test) => {
  const { findActorTeamUserStub } = setup();
  findActorTeamUserStub.resolves(null);
  const [forbidden] = await get("/team-users?teamId=a-team-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(forbidden.status, 403, "Responds with forbidden");
});

test("GET /team-users?teamId: CALA admin", async (t: Test) => {
  const { findActorTeamUserStub } = setup({ role: "ADMIN" });
  const [response, body] = await get("/team-users?teamId=a-team-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "Responds with success");
  t.deepEqual(body, [JSON.parse(JSON.stringify(tu1))], "Returns TeamUser");
  t.equal(
    findActorTeamUserStub.callCount,
    0,
    "Does not attempt to lookup the users team role"
  );
});

test("PATCH /team-users/:id: valid", async (t: Test) => {
  const { updateStub, findTeamUserByIdStub } = setup();
  const [response, body] = await patch(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: TeamUserRole.VIEWER,
    },
  });

  t.equal(response.status, 200, "Responds with success");
  t.deepEqual(body, JSON.parse(JSON.stringify(tu1)), "Returns TeamUser");
  t.deepEqual(
    updateStub.args[0].slice(1),
    [tu1.id, { role: TeamUserRole.VIEWER }],
    "Updates user with new role"
  );
  t.deepEqual(
    findTeamUserByIdStub.args[0][1],
    tu1.id,
    "Finds updated team user by id"
  );
});

test("PATCH /team-users/:id: invalid role", async (t: Test) => {
  const { updateStub } = setup();
  const [response] = await patch(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: "COOK",
    },
  });

  t.equal(response.status, 403, "Responds with success");
  t.equal(updateStub.callCount, 0, "Does not update with an invalid role");
});

test("PATCH /team-users/:id: invalid update body", async (t: Test) => {
  const { updateStub } = setup();
  const [response] = await patch(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: "COOK",
      teamId: "team-id",
    },
  });

  t.equal(response.status, 403, "Responds with success");
  t.equal(updateStub.callCount, 0, "Does not update with an invalid role");
});

test("PATCH /team-users/:id: cannot upgrade to owner", async (t: Test) => {
  const { updateStub } = setup();
  const [response] = await patch(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: "OWNER",
    },
  });

  t.equal(response.status, 403, "Responds with success");
  t.equal(updateStub.callCount, 0, "Does not update with an invalid role");
});

test("/team-users end-to-end", async (t: Test) => {
  const teamAdmin = await createUser();
  const teamMember = await createUser();
  const notAMember = await createUser();

  const trx = await db.transaction();
  const teamId = uuid.v4();

  try {
    const unusedTeam = await RawTeamsDAO.create(trx, {
      id: uuid.v4(),
      title: "Test Team",
      createdAt: now,
      deletedAt: null,
      type: TeamType.DESIGNER,
    });
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: Role.VIEWER,
      teamId: unusedTeam.id,
      userId: teamAdmin.user.id,
      userEmail: null,
    });

    await RawTeamsDAO.create(trx, {
      id: teamId,
      title: "Test Team",
      createdAt: now,
      deletedAt: null,
      type: TeamType.DESIGNER,
    });
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: Role.ADMIN,
      teamId,
      userId: teamAdmin.user.id,
      userEmail: null,
    });
  } catch (err) {
    await trx.rollback();
    t.fail(err.message);
  }
  await trx.commit();

  const [, viewer] = await post("/team-users", {
    headers: authHeader(teamAdmin.session.id),
    body: {
      teamId,
      userEmail: teamMember.user.email,
      role: Role.VIEWER,
    },
  });

  t.deepEqual(
    viewer.user,
    JSON.parse(JSON.stringify(teamMember.user)),
    "Returns TeamUser with User"
  );

  const [, teamMembers] = await get(`/team-users?teamId=${teamId}`, {
    headers: authHeader(teamAdmin.session.id),
  });

  for (const member of teamMembers) {
    const memberUser =
      teamAdmin.user.id === member.user.id ? teamAdmin.user : teamMember.user;
    t.deepEqual(
      JSON.parse(JSON.stringify(memberUser)),
      member.user,
      "attaches the correct user"
    );
  }

  const [unauthorized] = await get(`/team-users?teamId=${teamId}`, {
    headers: authHeader(notAMember.session.id),
  });

  t.equal(
    unauthorized.status,
    403,
    "Does not allow non-members to list team members"
  );
});
