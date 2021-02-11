import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, del, get, patch, post } from "../../test-helpers/http";
import createUser from "../../test-helpers/create-user";

import db from "../../services/db";
import * as PubSub from "../../services/pubsub";
import * as UsersDAO from "../users/dao";
import * as FindTeamPlans from "../plans/find-team-plans";
import * as TeamUserLockService from "./create-team-user-lock";
import * as StripeService from "../../services/stripe";
import { baseUser, Role as UserRole } from "../users/domain-object";
import SessionsDAO from "../../dao/sessions";
import TeamsDAO from "../teams/dao";
import TeamUsersDAO, { rawDao as RawTeamUsersDAO } from "./dao";
import { Role, TeamUser, TeamUserDb } from "./types";
import { generateTeam } from "../../test-helpers/factories/team";
import generatePlan from "../../test-helpers/factories/plan";
import * as SubscriptionsDAO from "../subscriptions/dao";
import { TeamType, TeamUserRole } from "../../published-types";

const now = new Date();
const tuDb1: TeamUserDb = {
  id: "a-team-user-id",
  teamId: "a-team-id",
  userId: "a-user-id",
  userEmail: null,
  role: Role.ADMIN,
  createdAt: now,
  deletedAt: null,
  updatedAt: now,
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
    findTeamNonViewerStub: sandbox()
      .stub(TeamUsersDAO, "countBilledUsers")
      .resolves(1),
    createStub: sandbox().stub(RawTeamUsersDAO, "create").resolves(tuDb1),
    findTeamUserByIdStub: sandbox()
      .stub(TeamUsersDAO, "findById")
      .resolves(tu1),
    updateStub: sandbox()
      .stub(RawTeamUsersDAO, "update")
      .resolves({ before: tuDb1, updated: tuDb1 }),
    transferOwnershipStub: sandbox()
      .stub(TeamUsersDAO, "transferOwnership")
      .resolves(),
    deleteStub: sandbox()
      .stub(TeamUsersDAO, "deleteById")
      .resolves({ teamId: "a-team-id" }),
    createTeamUserLockStub: sandbox()
      .stub(TeamUserLockService, "default")
      .resolves(),
    emitStub: sandbox().stub(PubSub, "emit").resolves(),
    areThereAvailableSeatsInTeamPlanStub: sandbox()
      .stub(FindTeamPlans, "areThereAvailableSeatsInTeamPlan")
      .resolves(true),
    addStripeSeatStub: sandbox()
      .stub(StripeService, "addSeatCharge")
      .resolves(),
    removeStripeSeatStub: sandbox()
      .stub(StripeService, "removeSeatCharge")
      .resolves(),
  };
}

test("POST /team-users: valid", async (t: Test) => {
  const { createStub, addStripeSeatStub } = setup();

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
  t.equal(
    addStripeSeatStub.args[0][1],
    "a-team-id",
    "calls Stripe seat service function with team ID"
  );
});

test("POST /team-users: invalid", async (t: Test) => {
  const { addStripeSeatStub } = setup();

  const [invalid] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "NOT A VALID ROLE!",
    },
  });

  t.equal(invalid.status, 400, "Requires a valid role");
  t.equal(addStripeSeatStub.callCount, 0, "Does not add Stripe seat charge");
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

test("POST /team-users: payment required when not enought seats in plan", async (t: Test) => {
  const { areThereAvailableSeatsInTeamPlanStub } = setup();
  areThereAvailableSeatsInTeamPlanStub.resolves(false);

  const [paymentRequired, body] = await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "ADMIN",
    },
  });

  t.equal(
    paymentRequired.status,
    402,
    "Returns Payment Required status when current plans does not allow to add more users"
  );

  t.deepEqual(
    body.message,
    "Your plan does not allow to add more team users, please upgrade"
  );
});

test("POST /team-users: calls areThereAvailableSeatsInTeamPlan with isAdmin for CALA admin", async (t: Test) => {
  const { areThereAvailableSeatsInTeamPlanStub, sessionsStub } = setup();

  sessionsStub.resolves({
    role: "USER",
    userId: "a-user-id",
  });
  await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "ADMIN",
    },
  });

  t.deepEqual(
    areThereAvailableSeatsInTeamPlanStub.args[0][3],
    false,
    "called with isAdmin false for request from regular user"
  );

  sessionsStub.resolves({
    role: "ADMIN",
    userId: "a-user-id",
  });

  await post("/team-users", {
    headers: authHeader("a-session-id"),
    body: {
      teamId: "a-team-id",
      userEmail: "teammate@example.com",
      role: "ADMIN",
    },
  });

  t.deepEqual(
    areThereAvailableSeatsInTeamPlanStub.args[1][3],
    true,
    "called with isAdmin true for request from admin user"
  );
});

test("POST /team-users: that we cannot add team users above the restriction (team-users lock) if team has a capacity and we send multiple concurrent requests", async (t: Test) => {
  const { user: teamUser, session: teamUserSession } = await createUser({
    role: "PARTNER",
  });
  const { team } = await generateTeam(teamUser.id);

  const trx = await db.transaction();

  try {
    const freeAndDefaultTeamPlan = await generatePlan(trx, {
      title: "Team Plan",
      isDefault: true,
      baseCostPerBillingIntervalCents: 0,
      perSeatCostPerBillingIntervalCents: 0,
      maximumSeatsPerTeam: 2,
    });

    // Team's subscription
    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: freeAndDefaultTeamPlan.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: null,
        teamId: team.id,
        isPaymentWaived: false,
      },
      trx
    );

    await trx.commit();
  } catch (e) {
    await trx.rollback();
  }

  // call two simultaneous requests
  const [[r1], [r2]] = await Promise.all([
    post("/team-users", {
      headers: authHeader(teamUserSession.id),
      body: {
        teamId: team.id,
        userEmail: "teammate1@example.com",
        role: "ADMIN",
      },
    }),

    // this one should fail
    await post("/team-users", {
      headers: authHeader(teamUserSession.id),
      body: {
        teamId: team.id,
        userEmail: "teammate2@example.com",
        role: "ADMIN",
      },
    }),
  ]);

  t.deepEqual(
    [r1.status, r2.status].sort(),
    [201, 402],
    "Only one request succeeds: one team user is created, another one is not because of the limit (2 - owner + new team member)"
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

test("PATCH /team-users/:id: valid downgrade to viewer", async (t: Test) => {
  const {
    updateStub,
    findTeamUserByIdStub,
    addStripeSeatStub,
    removeStripeSeatStub,
  } = setup();
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
  t.equal(
    addStripeSeatStub.callCount,
    0,
    "does not call stripe add seat function when downgrading to viewer"
  );
  t.equal(
    removeStripeSeatStub.callCount,
    1,
    "calls stripe remove seat function when downgrading a non-viewer to a viewer"
  );
});

test("PATCH /team-users/:id: valid role change to editor", async (t: Test) => {
  const {
    updateStub,
    findTeamUserByIdStub,
    addStripeSeatStub,
    removeStripeSeatStub,
  } = setup();
  const [response, body] = await patch(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: TeamUserRole.EDITOR,
    },
  });

  t.equal(response.status, 200, "Responds with success");
  t.deepEqual(body, JSON.parse(JSON.stringify(tu1)), "Returns TeamUser");
  t.deepEqual(
    updateStub.args[0].slice(1),
    [tu1.id, { role: TeamUserRole.EDITOR }],
    "Updates user with new role"
  );
  t.deepEqual(
    findTeamUserByIdStub.args[0][1],
    tu1.id,
    "Finds updated team user by id"
  );
  t.equal(
    addStripeSeatStub.callCount,
    0,
    "does not call stripe add seat function when changing between non-viewer roles"
  );
  t.equal(
    removeStripeSeatStub.callCount,
    0,
    "does not call stripe remove seat function when changing between non-viewer roles"
  );
});

test("PATCH /team-users/:id: upgrade from viewer to non-viewer no seats available", async (t: Test) => {
  const viewer = {
    ...tu1,
    role: TeamUserRole.VIEWER,
  };
  const {
    areThereAvailableSeatsInTeamPlanStub,
    findTeamUserByIdStub,
  } = setup();
  areThereAvailableSeatsInTeamPlanStub.resolves(false);
  findTeamUserByIdStub.resolves(viewer);
  const [response] = await patch(`/team-users/${viewer.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: TeamUserRole.EDITOR,
    },
  });

  t.equal(response.status, 402, "Responds with payment required");
});

test("PATCH /team-users/:id: upgrade from viewer to non-viewer", async (t: Test) => {
  const viewer = {
    ...tu1,
    role: TeamUserRole.VIEWER,
  };
  const {
    updateStub,
    findTeamUserByIdStub,
    addStripeSeatStub,
    removeStripeSeatStub,
  } = setup();
  findTeamUserByIdStub.resolves(viewer);
  const [response, body] = await patch(`/team-users/${viewer.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: TeamUserRole.EDITOR,
    },
  });

  t.equal(response.status, 200, "Responds with success");
  t.deepEqual(body, JSON.parse(JSON.stringify(viewer)), "Returns TeamUser");
  t.deepEqual(
    updateStub.args[0].slice(1),
    [viewer.id, { role: TeamUserRole.EDITOR }],
    "Updates user with new role"
  );
  t.deepEqual(
    findTeamUserByIdStub.args[0][1],
    viewer.id,
    "Finds updated team user by id"
  );
  t.equal(
    addStripeSeatStub.args[0][1],
    "a-team-id",
    "calls stripe function to add a non-viewer seat charge"
  );

  t.equal(
    removeStripeSeatStub.callCount,
    0,
    "does not call stripe remove seat function when upgrading to a non-viewer"
  );
});

test("PATCH /team-users/:id: invalid role", async (t: Test) => {
  const { updateStub, addStripeSeatStub } = setup();
  const [response] = await patch(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: "COOK",
    },
  });

  t.equal(response.status, 403, "Responds with forbidden status");
  t.equal(updateStub.callCount, 0, "Does not update with an invalid role");
  t.equal(
    addStripeSeatStub.callCount,
    0,
    "Does not call stripe add seat function"
  );
});

test("PATCH /team-users/:id: invalid update body", async (t: Test) => {
  const { updateStub, addStripeSeatStub } = setup();
  const [response] = await patch(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: "COOK",
      teamId: "team-id",
    },
  });

  t.equal(response.status, 403, "Responds with forbidden status");
  t.equal(updateStub.callCount, 0, "Does not update with an invalid role");
  t.equal(
    addStripeSeatStub.callCount,
    0,
    "Does not call stripe add seat function"
  );
});

test("PATCH /team-users/:id: non-owners cannot upgrade to owner", async (t: Test) => {
  const {
    addStripeSeatStub,
    findActorTeamUserStub,
    updateStub,
    transferOwnershipStub,
  } = setup();
  findActorTeamUserStub.resolves({
    id: "a-team-owner",
    role: TeamUserRole.ADMIN,
  });
  const [response] = await patch(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: "OWNER",
    },
  });

  t.equal(response.status, 403, "Responds with forbidden status");
  t.equal(updateStub.callCount, 0, "Does not call the standard update method");
  t.equal(
    transferOwnershipStub.callCount,
    0,
    "Does not call special transfer ownership method"
  );
  t.equal(
    addStripeSeatStub.callCount,
    0,
    "Does not call stripe add seat function"
  );
});

test("PATCH /team-users/:id: owners can transfer ownership to viewer", async (t: Test) => {
  const {
    addStripeSeatStub,
    findTeamUserByIdStub,
    findActorTeamUserStub,
    transferOwnershipStub,
  } = setup();
  const teamViewer: TeamUser = {
    ...tu1,
    id: "viewer",
    role: Role.VIEWER,
  };
  const teamOwner: TeamUser = {
    ...tu1,
    id: "owner",
    role: Role.OWNER,
  };
  findTeamUserByIdStub.onFirstCall().resolves(teamViewer); // requireTeamUserByTeamUserId
  findTeamUserByIdStub.onSecondCall().resolves(teamViewer); // before update
  findTeamUserByIdStub
    .onThirdCall()
    .resolves({ ...teamViewer, role: Role.OWNER }); // after update
  findActorTeamUserStub.resolves(teamOwner);

  const [response] = await patch(`/team-users/${teamViewer.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: "OWNER",
    },
  });

  t.equal(response.status, 200, "Responds with forbidden status");
  t.equal(
    transferOwnershipStub.callCount,
    1,
    "Calls the special transfer ownership method"
  );
  t.equal(
    addStripeSeatStub.callCount,
    1,
    "Calls stripe function to charge for new seat"
  );
});

test("PATCH /team-users/:id: admin can't downgrade owner", async (t: Test) => {
  const {
    addStripeSeatStub,
    findTeamUserByIdStub,
    findActorTeamUserStub,
    updateStub,
    transferOwnershipStub,
  } = setup();
  findTeamUserByIdStub.resolves({
    ...tu1,
    role: Role.OWNER,
  });

  findActorTeamUserStub.resolves({
    id: "a-team-admin",
    role: TeamUserRole.ADMIN,
  });

  const [response] = await patch(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: "VIEWER",
    },
  });

  t.equal(response.status, 403, "Responds with forbidden status");
  t.equal(updateStub.callCount, 0, "Does not call the standard update method");
  t.equal(
    transferOwnershipStub.callCount,
    0,
    "Does not call the special transfer ownership method"
  );
  t.equal(
    addStripeSeatStub.callCount,
    0,
    "Does not call stripe add seat function"
  );
});

test("PATCH /team-users/:id: CALA admin can transfer ownership", async (t: Test) => {
  const { transferOwnershipStub } = setup({ role: "ADMIN" });
  const [response] = await patch(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
    body: {
      role: "OWNER",
    },
  });

  t.equal(response.status, 200, "Responds with success");
  t.equal(
    transferOwnershipStub.callCount,
    1,
    "Calls the special transfer ownership method"
  );
});

test("DEL /team-users/:id throws a 404 if team user not found", async (t: Test) => {
  const { findTeamUserByIdStub } = setup();
  findTeamUserByIdStub.resolves(null);

  const [response] = await del(`/team-users/0000-0000-0000`, {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 404);
});

test("DEL /team-users/:id allows admins to delete users ", async (t: Test) => {
  const { deleteStub, removeStripeSeatStub } = setup();
  const [response] = await del(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 204, "Allows deletion");
  t.equal(deleteStub.args[0][1], tu1.id);
  t.equal(removeStripeSeatStub.callCount, 1, "Removes seat from Stripe");
});

test("DEL /team-users/:id not allowed as non-admin ", async (t: Test) => {
  const { deleteStub, findActorTeamUserStub, removeStripeSeatStub } = setup();
  findActorTeamUserStub.resolves({
    id: "not-the-same",
    role: TeamUserRole.VIEWER,
  });
  const [response] = await del(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 403, "Does not allow deletion");
  t.equal(deleteStub.callCount, 0, "Does not delete with an invalid role");
  t.equal(
    removeStripeSeatStub.callCount,
    0,
    "Does not update Stripe seat count"
  );
});

test("DEL /team-users/:id allows self-delete when non-admin", async (t: Test) => {
  const {
    deleteStub,
    findTeamUserByIdStub,
    findActorTeamUserStub,
    removeStripeSeatStub,
  } = setup();
  findTeamUserByIdStub.resolves({
    ...tu1,
    role: TeamUserRole.VIEWER,
  });
  findActorTeamUserStub.resolves({
    id: tu1.id,
    role: TeamUserRole.VIEWER,
  });
  const [response] = await del(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 204, "Allows deletion of self");
  t.equal(deleteStub.callCount, 1, "Deletes own team user");
  t.equal(
    removeStripeSeatStub.callCount,
    0,
    "Does not update Stripe seat count when user is a viewer"
  );
});

test("DEL /team-users/:id doesn't allow team owner to self-delete", async (t: Test) => {
  const { deleteStub, findActorTeamUserStub, findTeamUserByIdStub } = setup();
  const teamOwner: TeamUser = {
    ...tu1,
    role: Role.OWNER,
  };
  findTeamUserByIdStub.resolves(teamOwner);
  findActorTeamUserStub.resolves(teamOwner);

  const [response] = await del(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 403, "Does not allow deletion");
  t.equal(deleteStub.callCount, 0, "Does not delete the team owner");
});

test("DEL /team-users/:id doesn't allow team admin to delete team owner", async (t: Test) => {
  const { deleteStub, findActorTeamUserStub, findTeamUserByIdStub } = setup();
  findActorTeamUserStub.resolves({
    userId: tu1.userId,
    role: TeamUserRole.ADMIN,
  });
  findTeamUserByIdStub.resolves({
    userId: tu1.userId,
    role: TeamUserRole.OWNER,
  });

  const [response] = await del(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 403, "Does not allow deletion");
  t.equal(deleteStub.callCount, 0, "Does not delete the team owner");
});

test("DEL /team-users/:id doesn't allow CALA admin to delete team owner", async (t: Test) => {
  const { deleteStub, findTeamUserByIdStub } = setup({ role: "ADMIN" });
  findTeamUserByIdStub.resolves({
    userId: tu1.userId,
    role: TeamUserRole.OWNER,
  });

  const [response] = await del(`/team-users/${tu1.id}`, {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 403, "Does not allow deletion");
  t.equal(deleteStub.callCount, 0, "Does not delete the team owner");
});

test("/team-users end-to-end", async (t: Test) => {
  sandbox()
    .stub(FindTeamPlans, "areThereAvailableSeatsInTeamPlan")
    .resolves(true);

  const teamAdmin = await createUser();
  const teamMember = await createUser();
  const notAMember = await createUser();

  const trx = await db.transaction();
  const teamId = uuid.v4();

  try {
    const unusedTeam = await TeamsDAO.create(trx, {
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
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });

    await TeamsDAO.create(trx, {
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
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
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
