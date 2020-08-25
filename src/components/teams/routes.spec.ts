import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, get, post } from "../../test-helpers/http";

import SessionsDAO from "../../dao/sessions";
import TeamUsersDAO from "../team-users/dao";
import TeamsDAO from "./dao";
import { Team } from "./types";

function setup() {
  const now = new Date();
  sandbox().useFakeTimers(now);
  sandbox().stub(uuid, "v4").returns("a-team-id");
  const t1: Team = {
    id: "a-team-id",
    title: "A team",
    createdAt: now,
    deletedAt: null,
  };
  return {
    sessionsStub: sandbox().stub(SessionsDAO, "findById").resolves({
      role: "USER",
      userId: "a-user-id",
    }),
    createStub: sandbox().stub(TeamsDAO, "create").resolves(t1),
    createUserStub: sandbox().stub(TeamUsersDAO, "create").resolves(),
    findByUserStub: sandbox().stub(TeamsDAO, "findByUser").resolves([t1]),
    teams: [t1],
    now,
  };
}

test("POST /teams", async (t: Test) => {
  const {
    createStub,
    sessionsStub,
    teams: [t1],
  } = setup();

  const [response, body] = await post("/teams", {
    headers: authHeader("a-session-id"),
    body: {
      title: t1.title,
    },
  });

  t.equal(response.status, 201);
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify(t1)),
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
  const {
    findByUserStub,
    teams: [t1],
  } = setup();

  const [response, body] = await get("/teams?userId=a-user-id", {
    headers: authHeader("a-session-id"),
  });

  t.deepEqual(
    findByUserStub.args[0][1],
    "a-user-id",
    "gets teams by correct user"
  );
  t.equal(response.status, 200, "responds successfully");
  t.deepEqual(body, [JSON.parse(JSON.stringify(t1))]);

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
});
