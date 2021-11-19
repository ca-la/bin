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
import * as GetUpdateDetailsService from "../subscriptions/get-update-details";
import { Subscription } from "../subscriptions/domain-object";
import * as attachPlan from "../subscriptions/attach-plan";
import InvalidDataError from "../../errors/invalid-data";

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
    createTeamWithOwnerAndSubscriptionStub: sandbox()
      .stub(TeamsService, "createTeamWithOwnerAndSubscription")
      .resolves({
        ...t1,
        role: TeamUserRole.OWNER,
        teamUserId: "a-team-user-id",
      }),
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
    attachPlanStub: sandbox()
      .stub(attachPlan, "default")
      .callsFake((x: any) => x),

    now,
  };
}

test("POST /teams", async (t: Test) => {
  const { createTeamWithOwnerAndSubscriptionStub, sessionsStub } = setup();

  const [response, body] = await post("/teams", {
    headers: authHeader("a-session-id"),
    body: {
      title: t1.title,
    },
  });

  t.equal(response.status, 201);
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify({
        ...t1,
        role: TeamUserRole.OWNER,
        teamUserId: "a-team-user-id",
      })
    ),
    "returns the created team"
  );
  t.deepEqual(
    createTeamWithOwnerAndSubscriptionStub.args[0].slice(1),
    [{ title: t1.title }, "a-user-id"],
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

  t.equal(response.status, 200, "allows fetching list by own userId");
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

  const [response1, body1] = await get("/teams?type=DESIGNER", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response1.status, 200, "allows filtering by type");
  t.deepEqual(body1, [JSON.parse(JSON.stringify(t1))]);

  const [response2, body2] = await get("/teams?userId=a-user-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response2.status, 200, "allows filtering by user ID");
  t.deepEqual(body2, [JSON.parse(JSON.stringify(t1))]);

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

  sandbox().stub(TeamUsersDAO, "findOne").resolves(null);

  const [response, body] = await get("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.deepEqual(body, JSON.parse(JSON.stringify(t1)));
});

test("GET /teams/:id as team member returns role and teamUserId", async (t: Test) => {
  setup();

  const roleAndTeamUserId = {
    role: TeamUserRole.VIEWER,
    id: "tu1",
  };
  sandbox().stub(TeamUsersDAO, "findOne").resolves(roleAndTeamUserId);

  const [response, body] = await get("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 200, "responds successfully");
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify({
        ...t1,
        role: roleAndTeamUserId.role,
        teamUserId: roleAndTeamUserId.id,
      })
    )
  );
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
    responseBody: { ...t1, role: TeamUserRole.VIEWER },
  },
  {
    title: "GET /teams/:id for team user with EDITOR role",
    findTeamUserStub: { role: TeamUserRole.EDITOR },
    responseStatus: 200,
    responseBody: { ...t1, role: TeamUserRole.EDITOR },
  },
  {
    title: "GET /teams/:id for team user with ADMIN role",
    findTeamUserStub: { role: TeamUserRole.ADMIN },
    responseStatus: 200,
    responseBody: { ...t1, role: TeamUserRole.ADMIN },
  },
  {
    title: "GET /teams/:id for team user with OWNER role",
    findTeamUserStub: { role: TeamUserRole.OWNER },
    responseStatus: 200,
    responseBody: { ...t1, role: TeamUserRole.OWNER },
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
  sandbox().stub(TeamUsersDAO, "findOne").resolves({ role: "OWNER" });

  const [response] = await patch("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
    body: { type: "PARTNER" },
  });
  t.equal(response.status, 200, "responds successfully");
  t.equal(updateStub.args[0][1], "a-team-id");
  t.deepEqual(updateStub.args[0][2], { type: "PARTNER" });
});

test("PATCH /teams/:id doesn't accept empty title", async (t: Test) => {
  const { updateStub } = setup({ role: "ADMIN" });

  const [response] = await patch("/teams/a-team-id", {
    headers: authHeader("a-session-id"),
    body: { title: "" },
  });
  t.equal(response.status, 400, "cannot update title with empty string");
  t.equal(updateStub.callCount, 0);
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
    [{ ...postResponse[1], role: "OWNER" }],
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
      "PATCH /teams/:id/subscription accepts missing stripeCardToken property",
    userRole: "USER",
    findTeamUserStub: { role: TeamUserRole.OWNER },
    upgradeTeamSubscriptionStub: {
      id: "a-subscription-id",
    },
    requestBody: {
      planId: "a-plan-id",
    },
    responseStatus: 200,
  },
  {
    title:
      "PATCH /teams/:id/subscription accepts nullable stripeCardToken property",
    userRole: "USER",
    findTeamUserStub: { role: TeamUserRole.OWNER },
    upgradeTeamSubscriptionStub: {
      id: "a-subscription-id",
    },
    requestBody: {
      planId: "a-plan-id",
      stripeCardToken: null,
    },
    responseStatus: 200,
  },
  {
    title:
      "PATCH /teams/:id/subscription forbidden for regular user not a team member",
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
      "PATCH /teams/:id/subscription response successfully for a team user with EDITOR role",
    userRole: "USER",
    findTeamUserStub: { role: TeamUserRole.EDITOR },
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
    title:
      "PATCH /teams/:id/subscription response successfully for a team user with EDITOR role",
    userRole: "USER",
    findTeamUserStub: { role: TeamUserRole.ADMIN },
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

test("PATCH /teams/:id/subscription successfully and upgradeTeamSubscription called with right arguments", async (t: Test) => {
  const { attachPlanStub } = setup({ role: "USER" });
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
    teamId: "a-team-id",
    planId: "plan-id",
    stripeCardToken: "a-stripe-card-token",
  });

  t.equal(response.status, 200, `responds with expected status: 200`);
  t.deepEqual(body, JSON.parse(JSON.stringify({ id: "a-subscription-id" })));
  t.equal(attachPlanStub.callCount, 1, "plan attached to subscription");
});

test("PATCH /teams/:id/subscription catch InvalidDataError and set response status 400", async (t: Test) => {
  setup({ role: "USER" });
  sandbox()
    .stub(TeamUsersDAO, "findOne")
    .resolves({ role: TeamUserRole.OWNER });
  const upgradeTeamSubscriptionStub = sandbox()
    .stub(SubscriptionUpgradeService, "upgradeTeamSubscription")
    .throws(
      new InvalidDataError("Can't downgrade from paid plan to free plan")
    );

  const [response, body] = await patch("/teams/a-team-id/subscription", {
    headers: authHeader("a-session-id"),
    body: {
      planId: "plan-id",
      stripeCardToken: "a-stripe-card-token",
    },
  });

  t.deepEqual(upgradeTeamSubscriptionStub.args[0][1], {
    teamId: "a-team-id",
    planId: "plan-id",
    stripeCardToken: "a-stripe-card-token",
  });

  t.equal(
    response.status,
    400,
    `responds with expected status 400 on InvalidDataError`
  );
  t.equal(
    body.message,
    "Can't downgrade from paid plan to free plan",
    "with correct error message in body"
  );
});

test("PATCH /teams/:id/subscription catch other errors and set response status 500", async (t: Test) => {
  setup({ role: "USER" });
  sandbox()
    .stub(TeamUsersDAO, "findOne")
    .resolves({ role: TeamUserRole.OWNER });
  const upgradeTeamSubscriptionStub = sandbox()
    .stub(SubscriptionUpgradeService, "upgradeTeamSubscription")
    .throws(new Error("Plan has no Stripe prices"));

  const [response] = await patch("/teams/a-team-id/subscription", {
    headers: authHeader("a-session-id"),
    body: {
      planId: "plan-id",
      stripeCardToken: "a-stripe-card-token",
    },
  });

  t.deepEqual(upgradeTeamSubscriptionStub.args[0][1], {
    teamId: "a-team-id",
    planId: "plan-id",
    stripeCardToken: "a-stripe-card-token",
  });

  t.equal(
    response.status,
    500,
    `responds with expected status 500 on generic error`
  );
});

test("GET /teams/:id/subscription: valid", async (t: Test) => {
  setup({ role: "USER" });
  sandbox()
    .stub(TeamUsersDAO, "findOne")
    .resolves({ role: TeamUserRole.OWNER });
  const getUpdateDetailsStub = sandbox()
    .stub(GetUpdateDetailsService, "getTeamSubscriptionUpdateDetails")
    .resolves({
      proratedChargeCents: 100_00,
      prorationDate: new Date(2012, 11, 24),
    });

  const [response, body] = await get(
    "/teams/a-team-id/subscription?planId=a-new-plan-id",
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.deepEqual(getUpdateDetailsStub.args[0][1], {
    teamId: "a-team-id",
    planId: "a-new-plan-id",
  });

  t.equal(response.status, 200, `responds with expected status: 200`);
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify({
        proratedChargeCents: 100_00,
        prorationDate: new Date(2012, 11, 24),
      })
    )
  );
});

test("GET /teams/:id/subscription: not team user with correct permissions", async (t: Test) => {
  setup({ role: "USER" });

  const getUpdateDetailsStub = sandbox().stub(
    GetUpdateDetailsService,
    "getTeamSubscriptionUpdateDetails"
  );

  const findTeamUserStub = sandbox()
    .stub(TeamUsersDAO, "findOne")
    .resolves(null);
  const [noTeamUser] = await get(
    "/teams/a-team-id/subscription?planId=a-new-plan-id",
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(
    getUpdateDetailsStub.callCount,
    0,
    "does not try to get update details"
  );

  t.equal(noTeamUser.status, 403, `responds with expected status 403`);

  findTeamUserStub.resolves({ role: TeamUserRole.VIEWER });
  const [viewer] = await get(
    "/teams/a-team-id/subscription?planId=a-new-plan-id",
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(
    getUpdateDetailsStub.callCount,
    0,
    "does not try to get update details"
  );

  t.equal(viewer.status, 403, `responds with expected status 403`);
});
