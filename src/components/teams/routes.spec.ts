import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, get, patch, post, del } from "../../test-helpers/http";

import SessionsDAO from "../../dao/sessions";
import TeamUsersDAO from "../team-users/dao";
import { TeamUser, Role as TeamUserRole } from "../team-users/types";
import TeamsDAO from "./dao";
import { TeamDb, TeamType } from "./types";
import createUser from "../../test-helpers/create-user";
import { Role } from "../users/types";
import * as PubSub from "../../services/pubsub";
import * as TeamsService from "./service";
import * as PlansDAO from "../plans/dao";
import * as SubscriptionService from "../subscriptions/create";
import * as SubscriptionUpgradeService from "../subscriptions/upgrade";
import { Subscription } from "../subscriptions/domain-object";

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
    deleteStub: sandbox().stub(TeamsDAO, "deleteById").resolves(t1),
    emitStub: sandbox().stub(PubSub, "emit").resolves(),
    findFreeDefaultPlanStub: sandbox()
      .stub(PlansDAO, "findFreeAndDefaultForTeams")
      .resolves({ id: "a-free-plan-id" }),
    createSubscriptionStub: sandbox()
      .stub(SubscriptionService, "createSubscription")
      .resolves(),

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

test("POST /teams creates subscription with free plan", async (t: Test) => {
  const { findFreeDefaultPlanStub, createSubscriptionStub } = setup();

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

  t.equal(
    findFreeDefaultPlanStub.callCount,
    1,
    "Calls correct DAO function to get free default plan"
  );

  t.deepEqual(
    createSubscriptionStub.args[0][1].teamId,
    "a-team-id",
    "calls createOrUpdateSubscription with correct teamId"
  );
  t.deepEqual(
    createSubscriptionStub.args[0][1].planId,
    "a-free-plan-id",
    "calls createOrUpdateSubscription with correct planId"
  );
  t.deepEqual(
    createSubscriptionStub.args[0][1].userId,
    "a-user-id",
    "calls createOrUpdateSubscription with correct userId"
  );
});

test("POST /teams creates the team without subscription if plan is not free", async (t: Test) => {
  const { findFreeDefaultPlanStub, createSubscriptionStub } = setup();
  findFreeDefaultPlanStub.resolves(null);

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

  t.equal(
    findFreeDefaultPlanStub.callCount,
    1,
    "Calls correct DAO function to get free default plan"
  );

  t.equal(
    createSubscriptionStub.callCount,
    0,
    "don't call createOrUpdateSubscription for the team when default plan is not free"
  );
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

interface TeamAccessTestCase {
  title: string;
  findTeamUserStub: Partial<TeamUser> | null;
  responseStatus: number;
  responseBody?: any;
}

const teamAccessTestCases: TeamAccessTestCase[] = [
  {
    title: "GET /teams/:id forbidden for regular not a team USER",
    findTeamUserStub: null,
    responseStatus: 403,
  },
  {
    title: "GET /teams/:id for team user with VIEWER role",
    findTeamUserStub: { role: TeamUserRole.VIEWER },
    responseStatus: 200,
    responseBody: t1,
  },
  {
    title: "GET /teams/:id for team user with EDITOR role",
    findTeamUserStub: { role: TeamUserRole.EDITOR },
    responseStatus: 200,
    responseBody: t1,
  },
  {
    title: "GET /teams/:id for team user with ADMIN role",
    findTeamUserStub: { role: TeamUserRole.ADMIN },
    responseStatus: 200,
    responseBody: t1,
  },
  {
    title: "GET /teams/:id for team user with OWNER role",
    findTeamUserStub: { role: TeamUserRole.OWNER },
    responseStatus: 200,
    responseBody: t1,
  },
  {
    title: "GET /teams/:id forbidden for team user with unexpected team role",
    findTeamUserStub: { role: "NOT_A_ROLE" as TeamUserRole },
    responseStatus: 403,
  },
];

for (const testCase of teamAccessTestCases) {
  test(testCase.title, async (t: Test) => {
    setup({ role: "USER" });
    sandbox().stub(TeamUsersDAO, "findOne").resolves(testCase.findTeamUserStub);

    const [response, body] = await get("/teams/a-team-id", {
      headers: authHeader("a-session-id"),
    });
    t.equal(
      response.status,
      testCase.responseStatus,
      "responds successfully for team user with VIEWER role"
    );

    if (testCase.responseBody) {
      t.deepEqual(body, JSON.parse(JSON.stringify(testCase.responseBody)));
    }
  });
}

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
  const { deleteStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves(null);

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "Does not allow random users to delete teams");
  t.deepEqual(deleteStub.args, []);
});

test("DELETE /teams/:id as team EDITOR", async (t: Test) => {
  const { deleteStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "EDITOR" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "Does not allow team editors to delete teams");
  t.deepEqual(deleteStub.args, []);
});

test("DELETE /teams/:id as team OWNER", async (t: Test) => {
  const { deleteStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "OWNER" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(deleteStub.args[0][1], "a-team-id");
});

test("DELETE /teams/:id as ADMIN", async (t: Test) => {
  const { deleteStub } = setup({ role: "ADMIN" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(deleteStub.args[0][1], "a-team-id");
});

test("DELETE /teams/:id as random USER", async (t: Test) => {
  const { deleteStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves(null);

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "Does not allow random users to delete teams");
  t.deepEqual(deleteStub.args, []);
});

test("DELETE /teams/:id as team EDITOR", async (t: Test) => {
  const { deleteStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "EDITOR" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "Does not allow team editors to delete teams");
  t.deepEqual(deleteStub.args, []);
});

test("DELETE /teams/:id as team OWNER", async (t: Test) => {
  const { deleteStub } = setup();

  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "OWNER" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(deleteStub.args[0][1], "a-team-id");
});

test("DELETE /teams/:id as ADMIN", async (t: Test) => {
  const { deleteStub } = setup({ role: "ADMIN" });

  const [response] = await del("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(deleteStub.args[0][1], "a-team-id");
});

test("POST -> GET /teams end-to-end", async (t: Test) => {
  sandbox()
    .stub(PlansDAO, "findFreeAndDefaultForTeams")
    .resolves({ id: "a-free-plan-id" });
  sandbox().stub(SubscriptionService, "createSubscription").resolves();

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

interface TeamSubscriptionPatchTestCase {
  title: string;
  userRole?: Role;
  findTeamUserStub: Partial<TeamUser> | null;
  upgradeTeamSubscriptionStub: Partial<Subscription> | null;
  responseStatus: number;
  requestBody?: any;
  responseBody?: any;
}

const teamSubscriptionPathTestCases: TeamSubscriptionPatchTestCase[] = [
  {
    title: "PATCH /teams/:id/subscription missing all required properties",
    userRole: "USER",
    findTeamUserStub: { role: TeamUserRole.OWNER },
    upgradeTeamSubscriptionStub: null,
    responseStatus: 400,
  },
  {
    title: "PATCH /teams/:id/subscription missing required planId property",
    userRole: "USER",
    findTeamUserStub: { role: TeamUserRole.OWNER },
    upgradeTeamSubscriptionStub: null,
    requestBody: {
      stripeCardToken: "a-stripe-card-token",
    },
    responseStatus: 400,
  },
  {
    title:
      "PATCH /teams/:id/subscription missing required stripeCardToken property",
    userRole: "USER",
    findTeamUserStub: { role: TeamUserRole.OWNER },
    upgradeTeamSubscriptionStub: null,
    requestBody: {
      planId: "a-plan-id",
    },
    responseStatus: 400,
  },
  {
    title:
      "PATCH /teams/:id/subscription forbidden for regular user not a team OWNER",
    userRole: "USER",
    findTeamUserStub: null,
    upgradeTeamSubscriptionStub: null,
    requestBody: {
      planId: "plan-id",
      stripeCardToken: "a-stripe-card-token",
    },
    responseStatus: 403,
  },
  {
    title:
      "PATCH /teams/:id/subscription forbidden for a team user with VIEWER role",
    userRole: "USER",
    findTeamUserStub: { role: TeamUserRole.VIEWER },
    upgradeTeamSubscriptionStub: null,
    requestBody: {
      planId: "plan-id",
      stripeCardToken: "a-stripe-card-token",
    },
    responseStatus: 403,
  },
  {
    title:
      "PATCH /teams/:id/subscription forbidden for a team user with EDITOR role",
    userRole: "USER",
    findTeamUserStub: { role: TeamUserRole.EDITOR },
    upgradeTeamSubscriptionStub: null,
    requestBody: {
      planId: "plan-id",
      stripeCardToken: "a-stripe-card-token",
    },
    responseStatus: 403,
  },
  {
    title:
      "PATCH /teams/:id/subscription forbidden for a team user with ADMIN role",
    userRole: "USER",
    findTeamUserStub: { role: TeamUserRole.ADMIN },
    upgradeTeamSubscriptionStub: null,
    requestBody: {
      planId: "plan-id",
      stripeCardToken: "a-stripe-card-token",
    },
    responseStatus: 403,
  },
  {
    title:
      "PATCH /teams/:id/subscription response successfully for a team user with OWNER role",
    userRole: "USER",
    findTeamUserStub: { role: TeamUserRole.OWNER },
    upgradeTeamSubscriptionStub: {
      id: "a-subscription-id",
    },
    requestBody: {
      planId: "plan-id",
      stripeCardToken: "a-stripe-card-token",
    },
    responseStatus: 200,
    responseBody: {
      id: "a-subscription-id",
    },
  },
  {
    title: "PATCH /teams/:id/subscription response successfully for CALA admin",
    userRole: "ADMIN",
    findTeamUserStub: null,
    upgradeTeamSubscriptionStub: {
      id: "a-subscription-id",
    },
    requestBody: {
      planId: "plan-id",
      stripeCardToken: "a-stripe-card-token",
    },
    responseStatus: 200,
    responseBody: {
      id: "a-subscription-id",
    },
  },
];

for (const testCase of teamSubscriptionPathTestCases) {
  test(testCase.title, async (t: Test) => {
    setup({ role: testCase.userRole });
    sandbox().stub(TeamUsersDAO, "findOne").resolves(testCase.findTeamUserStub);
    sandbox()
      .stub(SubscriptionUpgradeService, "upgradeTeamSubscription")
      .resolves(testCase.upgradeTeamSubscriptionStub);

    const [response, body] = await patch("/teams/a-team-id/subscription", {
      headers: authHeader("a-session-id"),
      ...(testCase.requestBody ? { body: testCase.requestBody } : null),
    });
    t.equal(
      response.status,
      testCase.responseStatus,
      `responds with expected status: ${testCase.responseStatus}`
    );

    if (testCase.responseBody) {
      t.deepEqual(body, JSON.parse(JSON.stringify(testCase.responseBody)));
    }
  });
}

test("PATH /teams/:id/subscription successfully and upgradeTeamSubscription called with right arguments", async (t: Test) => {
  setup({ role: "USER" });
  sandbox()
    .stub(TeamUsersDAO, "findOne")
    .resolves({ role: TeamUserRole.OWNER });
  const upgradeTeamSubscriptionStub = sandbox()
    .stub(SubscriptionUpgradeService, "upgradeTeamSubscription")
    .resolves({
      id: "a-subscription-id",
    });

  const [response, body] = await patch("/teams/a-team-id/subscription", {
    headers: authHeader("a-session-id"),
    body: {
      planId: "plan-id",
      stripeCardToken: "a-stripe-card-token",
    },
  });

  t.deepEqual(upgradeTeamSubscriptionStub.args[0][1], {
    userId: "a-user-id",
    teamId: "a-team-id",
    planId: "plan-id",
    stripeCardToken: "a-stripe-card-token",
  });

  t.equal(response.status, 200, `responds with expected status: 200`);
  t.deepEqual(body, JSON.parse(JSON.stringify({ id: "a-subscription-id" })));
});
