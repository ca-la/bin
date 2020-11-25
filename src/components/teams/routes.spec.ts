import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, get, patch, post, del } from "../../test-helpers/http";

import SessionsDAO from "../../dao/sessions";
import TeamUsersDAO from "../team-users/dao";
import TeamsDAO from "./dao";
import { TeamDb, TeamType } from "./types";
import createUser from "../../test-helpers/create-user";
import { Role } from "../users/types";
import * as PubSub from "../../services/pubsub";
import * as TeamsService from "./service";

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
    createWithOwnerStub: sandbox()
      .stub(TeamsService, "createTeamWithOwner")
      .resolves(t1),
    findCreatedTeamUserStub: sandbox()
      .stub(TeamUsersDAO, "findById")
      .resolves(),
    findStub: sandbox()
      .stub(TeamsDAO, "find")
      .resolves([{ ...t1 }]),
    findByUserStub: sandbox()
      .stub(TeamsDAO, "findByUser")
      .resolves([{ ...t1 }]),
    findByIdStub: sandbox()
      .stub(TeamsDAO, "findById")
      .resolves({ ...t1 }),
    findUnpaidStub: sandbox().stub(TeamsDAO, "findUnpaidTeams").resolves([t1]),
    findOneStub: sandbox().stub(TeamsDAO, "findOne").resolves([t1]),
    updateStub: sandbox().stub(TeamsDAO, "update").resolves({
      updated: t1,
    }),
    emitStub: sandbox().stub(PubSub, "emit").resolves(),
    now,
  };
}

test("POST /teams", async (t: Test) => {
  const { createWithOwnerStub, sessionsStub } = setup();

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
    createWithOwnerStub.args[0].slice(1),
    [t1.title, "a-user-id"],
    "calls createTeamWithOwner with the correct values"
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

test("GET /teams?filter with valid filter", async (t: Test) => {
  const { findUnpaidStub } = setup({ role: "ADMIN" });

  const [response, body] = await get("/teams?filter=UNPAID", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.deepEqual(body, [JSON.parse(JSON.stringify(t1))]);
  t.equal(findUnpaidStub.callCount, 1, "Calls correct DAO function");
});

test("GET /teams?filter with invalid filter", async (t: Test) => {
  setup({ role: "ADMIN" });

  const [response] = await get("/teams?filter=CACTUS", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 400, "Requires a valid filter");
});

test("GET /teams/:id as ADMIN", async (t: Test) => {
  setup({ role: "ADMIN" });

  const [response, body] = await get("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.deepEqual(body, JSON.parse(JSON.stringify(t1)));
});

test("GET /teams/:id as USER", async (t: Test) => {
  setup({ role: "USER" });

  const [response] = await get("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "only adminds can view");
});

test("PATCH /teams/:id as random USER", async (t: Test) => {
  const { updateStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves(null);

  const [response] = await patch("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
    body: { title: "new title" },
  });
  t.equal(response.status, 403, "Does not allow random users to patch teams");
  t.deepEqual(updateStub.args, []);
});

test("PATCH /teams/:id as team VIEWER", async (t: Test) => {
  const { updateStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "VIEWER" });

  const [response] = await patch("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
    body: { title: "new title" },
  });
  t.equal(response.status, 403, "Does not allow VIEWERs to patch teams");
  t.deepEqual(updateStub.args, []);
});

test("PATCH /teams/:id as team EDITOR", async (t: Test) => {
  const { updateStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "EDITOR" });

  const [response] = await patch("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
    body: { title: "new title" },
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(updateStub.args[0][1], "a-team-id");
  t.deepEqual(updateStub.args[0][2], { title: "new title" });
});

test("PATCH /teams/:id as team OWNER", async (t: Test) => {
  const { updateStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "OWNER" });

  const [response] = await patch("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
    body: { title: "new title" },
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(updateStub.args[0][1], "a-team-id");
  t.deepEqual(updateStub.args[0][2], { title: "new title" });
});

test("PATCH /teams/:id as ADMIN", async (t: Test) => {
  const { updateStub } = setup({ role: "ADMIN" });

  const [response] = await patch("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
    body: { type: "PARTNER" },
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(updateStub.args[0][1], "a-team-id");
  t.deepEqual(updateStub.args[0][2], { type: "PARTNER" });
});

test("DELETE /teams/:id as random USER", async (t: Test) => {
  const { updateStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves(null);

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "Does not allow random users to delete teams");
  t.deepEqual(updateStub.args, []);
});

test("DELETE /teams/:id as team EDITOR", async (t: Test) => {
  const { updateStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "EDITOR" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "Does not allow team editors to delete teams");
  t.deepEqual(updateStub.args, []);
});

test("DELETE /teams/:id as team OWNER", async (t: Test) => {
  const { updateStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "OWNER" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(updateStub.args[0][1], "a-team-id");
  t.deepEqual(updateStub.args[0][2], { deletedAt: now });
});

test("DELETE /teams/:id as ADMIN", async (t: Test) => {
  const { updateStub } = setup({ role: "ADMIN" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(updateStub.args[0][1], "a-team-id");
  t.deepEqual(updateStub.args[0][2], { deletedAt: now });
});

test("DELETE /teams/:id as random USER", async (t: Test) => {
  const { updateStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves(null);

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "Does not allow random users to delete teams");
  t.deepEqual(updateStub.args, []);
});

test("DELETE /teams/:id as team EDITOR", async (t: Test) => {
  const { updateStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "EDITOR" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "Does not allow team editors to delete teams");
  t.deepEqual(updateStub.args, []);
});

test("DELETE /teams/:id as team OWNER", async (t: Test) => {
  const { updateStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "OWNER" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(updateStub.args[0][1], "a-team-id");
  t.deepEqual(updateStub.args[0][2], { deletedAt: now });
});

test("DELETE /teams/:id as ADMIN", async (t: Test) => {
  const { updateStub } = setup({ role: "ADMIN" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(updateStub.args[0][1], "a-team-id");
  t.deepEqual(updateStub.args[0][2], { deletedAt: now });
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
