import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, get, post } from "../../test-helpers/http";

import SessionsDAO from "../../dao/sessions";
import TeamUsersDAO, { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import { Role as TeamUserRole } from "../team-users/types";
import TeamsDAO, { rawDao as RawTeamsDAO } from "./dao";
import { TeamDb, TeamType } from "./types";
import createUser from "../../test-helpers/create-user";
import { Role } from "../users/types";

const now = new Date(2012, 11, 23);
const t1: TeamDb = {
  id: "a-team-id",
  title: "A team",
  createdAt: now,
  deletedAt: null,
  type: TeamType.DESIGNER,
};

function setup({
  role = "USER",
}: {
  role?: Role;
} = {}) {
  sandbox().useFakeTimers(now);
  sandbox().stub(uuid, "v4").returns("a-team-id");
  return {
    sessionsStub: sandbox().stub(SessionsDAO, "findById").resolves({
      role,
      userId: "a-user-id",
    }),
    createStub: sandbox().stub(RawTeamsDAO, "create").resolves(t1),
    createUserStub: sandbox().stub(RawTeamUsersDAO, "create").resolves(),
    findCreatedTeamUserStub: sandbox()
      .stub(TeamUsersDAO, "findById")
      .resolves(),
    findStub: sandbox()
      .stub(TeamsDAO, "find")
      .resolves([{ ...t1, role: TeamUserRole.ADMIN }]),
    findByIdStub: sandbox()
      .stub(TeamsDAO, "findById")
      .resolves({ ...t1, role: TeamUserRole.ADMIN }),
    findRawStub: sandbox().stub(RawTeamsDAO, "find").resolves([t1]),
    findOneRawStub: sandbox().stub(RawTeamsDAO, "findOne").resolves([t1]),
    now,
  };
}

test("POST /teams", async (t: Test) => {
  const { createStub, sessionsStub } = setup();

  const [response, body] = await post("/teams", {
    headers: authHeader("a-session-id"),
    body: {
      title: t1.title,
    },
  });

  t.equal(response.status, 201);
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify({ ...t1, role: TeamUserRole.ADMIN })),
    "returns the created team from the DAO"
  );
  t.deepEqual(
    createStub.args[0][1],
    t1,
    "calls create with the correct values"
  );

  const [invalid] = await post("/teams", {
    headers: authHeader("a-session-id"),
    body: {
      foo: "bar",
    },
  });

  t.equal(invalid.status, 400, "Requires the title key");

  sessionsStub.resolves(null);

  const [unauthenticated] = await post("/teams", {
    headers: authHeader("a-session-id"),
    body: {
      title: t1.title,
    },
  });

  t.equal(unauthenticated.status, 401, "Does not allow unauthenticated users");
});

test("GET /teams", async (t: Test) => {
  const { sessionsStub } = setup();

  const [response, body] = await get("/teams?userId=a-user-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "responds successfully");
  t.deepEqual(body, [
    JSON.parse(JSON.stringify({ ...t1, role: TeamUserRole.ADMIN })),
  ]);

  const [unauthorized] = await get("/teams?userId=not-me", {
    headers: authHeader("a-session-id"),
  });
  t.deepEqual(
    unauthorized.status,
    403,
    "Does not allow users to query by other users"
  );

  const [missingQueryParam] = await get("/teams", {
    headers: authHeader("a-session-id"),
  });
  t.deepEqual(missingQueryParam.status, 400, "Requires the userId query param");

  sessionsStub.resolves(null);
  const [unauthenticated] = await get("/teams?userId=a-user-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(unauthenticated.status, 401, "Does not allow unauthenticated users");
});

test("GET /teams as ADMIN", async (t: Test) => {
  setup({ role: "ADMIN" });

  const [response, body] = await get("/teams?type=DESIGNER", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.deepEqual(body, [JSON.parse(JSON.stringify(t1))]);

  const [incorrectType] = await get("/teams?type=CACTUS", {
    headers: authHeader("a-session-id"),
  });
  t.equal(incorrectType.status, 400, "Requires a valid type");
});

test("GET /teams/:id as ADMIN", async (t: Test) => {
  setup({ role: "ADMIN" });

  const [response, body] = await get("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.deepEqual(body, [JSON.parse(JSON.stringify(t1))]);
});

test("GET /teams/:id as USER", async (t: Test) => {
  setup({ role: "USER" });

  const [response] = await get("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "only adminds can view");
});

test("POST -> GET /teams end-to-end", async (t: Test) => {
  const designer = await createUser();
  const another = await createUser();

  const postResponse = await post("/teams", {
    headers: authHeader(designer.session.id),
    body: {
      title: t1.title,
    },
  });

  t.equal(postResponse[0].status, 201, "returns correct status code");
  t.equal(postResponse[1].title, t1.title, "sets title");
  t.equal(
    postResponse[1].role,
    TeamUserRole.ADMIN,
    "returns your role on the team"
  );

  const getResponse = await get(`/teams?userId=${designer.user.id}`, {
    headers: authHeader(designer.session.id),
  });

  t.equal(getResponse[0].status, 200, "returns correct status code");
  t.deepEqual(
    getResponse[1],
    [postResponse[1]],
    "shows created team in list of teams"
  );

  const notFound = await get(`/teams?userId=${another.user.id}`, {
    headers: authHeader(another.session.id),
  });

  t.deepEqual(notFound[1], [], "does not show team for a different user");
});
