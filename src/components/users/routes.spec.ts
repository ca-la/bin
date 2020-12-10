import Knex from "knex";
import uuid from "node-uuid";

import * as attachSource from "../../services/stripe/attach-source";
import * as CohortsDAO from "../../components/cohorts/dao";
import * as CohortUsersDAO from "../../components/cohorts/users/dao";
import Config from "../../config";
import * as createStripeSubscription from "../../services/stripe/create-subscription";
import * as CreditsDAO from "../../components/credits/dao";
import * as DuplicationService from "../../services/duplicate";
import * as PlansDAO from "../plans/dao";
import * as PromoCodesDAO from "../../components/promo-codes/dao";
import TeamUsersDAO from "../../components/team-users/dao";
import * as SessionsDAO from "../../dao/sessions";
import * as SubscriptionsDAO from "../../components/subscriptions/dao";
import * as UsersDAO from "./dao";
import { BillingInterval } from "../plans/domain-object";
import createUser from "../../test-helpers/create-user";
import db from "../../services/db";
import InvalidDataError from "../../errors/invalid-data";
import MailChimp = require("../../services/mailchimp");
import Stripe = require("../../services/stripe");
import { authHeader, get, patch, post, put } from "../../test-helpers/http";
import { baseUser, UserIO } from "./domain-object";
import { sandbox, Test, test } from "../../test-helpers/fresh";
import * as TeamsService from "../teams/service";

const USER_DATA: UserIO = Object.freeze({
  email: "user@example.com",
  name: "Q User",
  password: "hunter2",
  phone: "415 580 9925",
});

function stubUserDependencies() {
  const duplicationStub = sandbox()
    .stub(DuplicationService, "duplicateDesigns")
    .resolves();
  const mailchimpStub = sandbox()
    .stub(MailChimp, "subscribeToUsers")
    .returns(Promise.resolve());
  const teamUsersStub = sandbox()
    .stub(TeamUsersDAO, "claimAllByEmail")
    .resolves();
  const createTeamStub = sandbox()
    .stub(TeamsService, "createTeamWithOwner")
    .resolves();

  return {
    duplicationStub,
    mailchimpStub,
    teamUsersStub,
    createTeamStub,
  };
}

test("POST /users returns a 400 if user creation fails", async (t: Test) => {
  stubUserDependencies();

  sandbox().stub(UsersDAO, "create").rejects(new InvalidDataError("Bad email"));

  const [response, body] = await post("/users", { body: USER_DATA });

  t.equal(response.status, 400, "status=400");
  t.equal(body.message, "Bad email");
});

test("POST /users allows public values to be set", async (t: Test) => {
  const { createTeamStub } = stubUserDependencies();

  const acceptedAt = new Date("2019-01-01").toISOString();

  const [response, body] = await post("/users", {
    body: {
      ...USER_DATA,
      lastAcceptedDesignerTermsAt: acceptedAt,
    },
  });

  t.equal(response.status, 201, "status=201");
  t.equal(body.name, "Q User");
  t.equal(body.email, "user@example.com");
  t.equal(body.phone, "+14155809925");
  t.equal(body.password, undefined);
  t.equal(body.passwordHash, undefined);
  t.equal(body.lastAcceptedDesignerTermsAt, acceptedAt);

  t.deepEqual(
    createTeamStub.args[0].slice(1),
    ["Q User's Team", body.id],
    "creates user's initial team if name is set"
  );
});

test("POST /users does not allow private values to be set", async (t: Test) => {
  stubUserDependencies();

  const data = {
    ...USER_DATA,
    role: "ADMIN",
  };

  const body = (await post("/users", { body: data }))[1];

  t.equal(body.role, "USER");
});
test("POST /users only allows CALA emails on restricted servers ", async (t: Test) => {
  stubUserDependencies();

  sandbox().stub(Config, "REQUIRE_CALA_EMAIL").value(true);

  const [invalidEmailresponse, invalidEmailBody] = await post("/users", {
    body: USER_DATA,
  });
  t.equal(invalidEmailresponse.status, 400, "status=400");
  t.true(
    invalidEmailBody.message.startsWith(
      "Only @ca.la or @calastg.com emails can"
    )
  );

  const [caDotEmailResponce] = await post("/users", {
    body: { ...USER_DATA, email: "test@ca.la", phone: "415 580 9926" },
  });
  t.equal(caDotEmailResponce.status, 201, "status=201");

  const [calastgEmailResponce] = await post("/users", {
    body: { ...USER_DATA, email: "test@calastg.com" },
  });
  t.equal(calastgEmailResponce.status, 201, "status=201");
});

test("POST /users returns a session instead if requested", async (t: Test) => {
  stubUserDependencies();

  const [response, body] = await post("/users?returnValue=session", {
    body: USER_DATA,
  });
  t.equal(response.status, 201, "status=201");
  t.equal(body.userId.length, 36);
  t.equal(body.user.name, "Q User");
});

test("POST /users allow creating a user with no name or password", async (t: Test) => {
  const { createTeamStub } = stubUserDependencies();

  const [response] = await post("/users?returnValue=session", {
    body: {
      ...USER_DATA,
      name: null,
      password: null,
    },
  });

  t.equal(response.status, 201);
  t.false(createTeamStub.called, "Does not create team for user with no name");
});

test("PUT /users/:id/password returns a 401 if unauthenticated", async (t: Test) => {
  const [response, body] = await put("/users/123/password", {
    body: USER_DATA,
  });
  t.equal(response.status, 401);
  t.equal(body.message, "Authorization is required to access this resource");
});

test("PUT /users/:id/password returns a 403 if not the current user", async (t: Test) => {
  const { session } = await createUser();
  const [response, body] = await await put("/users/123/password", {
    body: {},
    headers: authHeader(session.id),
  });
  t.equal(response.status, 403);
  t.equal(body.message, "You can only update your own user");
});

test("PUT /users/:id/password updates the current user", async (t: Test) => {
  const { user, session } = await createUser();
  const [response] = await put(`/users/${user.id}/password`, {
    body: {
      password: "hunter2",
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
});

test("GET /users list returns 401 if not authorized", async (t: Test) => {
  const [response, body] = await get("/users");
  t.equal(response.status, 401);
  t.equal(body.message, "Unauthorized");
});

test("GET /users list returns 403 if logged in but not admin", async (t: Test) => {
  const { session } = await createUser();
  const [response, body] = await get("/users", {
    headers: authHeader(session.id),
  });
  t.equal(response.status, 403);
  t.equal(body.message, "Forbidden");
});

test("GET /users list returns a list of users if authorized", async (t: Test) => {
  let userId: string;

  const { user, session } = await createUser({ role: "ADMIN" });
  userId = user.id;
  const [response, body] = await get("/users", {
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].id, userId);
});

test("GET /users/:id returns a user", async (t: Test) => {
  const { user, session } = await createUser({ role: "ADMIN" });
  const [response, body] = await get(`/users/${user.id}`, {
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.equal(body.name, "Q User");
});

test("GET /users/email-availability/:email returns false when unavailable", async (t: Test) => {
  const { user } = await createUser();
  const [response, body] = await get(`/users/email-availability/${user.email}`);
  t.equal(response.status, 200);
  t.deepEqual(body, { available: false, isTaken: true, isValid: true });
});

test("GET /users/email-availability/:email returns true when available", async (t: Test) => {
  const [response, body] = await get("/users/email-availability/fuz@buz.qux");
  t.equal(response.status, 200);
  t.deepEqual(body, { available: true, isTaken: false, isValid: true });
});

test("GET /users/email-availability/:email returns false when invalid", async (t: Test) => {
  const [response, body] = await get("/users/email-availability/fizzbuzz");
  t.equal(response.status, 200);
  t.deepEqual(body, { available: false, isTaken: false, isValid: false });
});

test("PATCH /users/:id returns a 401 if unauthenticated", async (t: Test) => {
  const [response, body] = await patch("/users/123", {
    body: {
      ...baseUser,
    },
  });
  t.equal(response.status, 401);
  t.equal(body.message, "Authorization is required to access this resource");
});

test("PATCH /users/:id returns a 403 if not the current user", async (t: Test) => {
  const { session } = await createUser();
  const [response, body] = await patch("/users/123", {
    body: {},
    headers: authHeader(session.id),
  });
  t.equal(response.status, 403);
  t.equal(body.message, "You can only update your own user");
});

test("PATCH /users/:id updates the current user", async (t: Test) => {
  const { user, session } = await createUser();
  const createTeamStub = sandbox()
    .stub(TeamsService, "createTeamWithOwner")
    .resolves();
  const [response, body] = await patch(`/users/${user.id}`, {
    body: {
      birthday: "2017-01-02",
      locale: "zh",
      name: "New Name",
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.equal(body.locale, "zh");
  t.equal(
    new Date(body.birthday).getMilliseconds(),
    new Date("2017-01-02").getMilliseconds()
  );
  t.equal(body.name, "New Name");
  t.false(
    createTeamStub.called,
    "Does not create a team when not setting the name for the first time"
  );
});

test("PATCH /users/:id does not allow private values to be set", async (t: Test) => {
  const { user, session } = await createUser();
  const [response, body] = await patch(`/users/${user.id}`, {
    body: {
      birthday: "2017-01-02",
      role: "ADMIN",
    },
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200);

  t.equal(body.role, "USER");
});

test("PATCH /users/:id allows admins to set private values", async (t: Test) => {
  const { user } = await createUser();
  const { session: adminSession } = await createUser({ role: "ADMIN" });
  const [response, body] = await patch(`/users/${user.id}`, {
    body: {
      birthday: "2017-01-02",
      role: "ADMIN",
    },
    headers: authHeader(adminSession.id),
  });

  t.equal(response.status, 200);

  t.equal(body.role, "ADMIN");
});

test("PATCH /users/:id returns errors on taken email", async (t: Test) => {
  const { user: user1, session } = await createUser();
  const { user: user2 } = await createUser();

  const [response, body] = await patch(`/users/${user1.id}`, {
    body: {
      email: user2.email,
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 400);
  t.true(Array.isArray(body.errors) && body.errors.length === 1);
});

test("PATCH /users/:id returns error on incorrect password", async (t: Test) => {
  const { user, session } = await createUser();

  const [response, body] = await patch(`/users/${user.id}`, {
    body: {
      currentPassword: "incorrectPassword",
      newPassword: "hunter3",
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 400);
  t.true(Array.isArray(body.errors) && body.errors.length === 1);
});

test("PATCH /users/:id returns error on password update fail", async (t: Test) => {
  const { user, session } = await createUser();

  sandbox()
    .stub(UsersDAO, "updatePassword")
    .throws(new InvalidDataError("update failed"));

  const [response, body] = await patch(`/users/${user.id}`, {
    body: {
      email: user.email,
      currentPassword: "hunter2",
      newPassword: "*******",
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 400);
  t.true(Array.isArray(body.errors) && body.errors.length === 1);
  t.true(body.errors[0].name === "InvalidDataError");
});

test("PATCH /users/:id allows completing a user registration", async (t: Test) => {
  const incomplete = await UsersDAO.create(
    {
      email: "somebody@example.com",
      role: "USER",
      name: null,
      password: null,
      referralCode: "freebie",
    },
    { requirePassword: false }
  );
  const session = await SessionsDAO.createForUser(incomplete);
  const createTeamStub = sandbox()
    .stub(TeamsService, "createTeamWithOwner")
    .resolves();

  const [response, body] = await patch(`/users/${incomplete.id}`, {
    body: {
      name: "New Name",
      newPassword: "abc123",
    },
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200);
  t.equal(body.name, "New Name");
  t.deepEqual(
    createTeamStub.args[0].slice(1),
    ["New Name's Team", body.id],
    "Creates a new team with the newly set user name"
  );

  const alreadyComplete = await createUser();

  const [invalidData] = await patch(`/users/${alreadyComplete.user.id}`, {
    body: {
      newPassword: "pwned",
    },
    headers: authHeader(alreadyComplete.session.id),
  });

  t.equal(
    invalidData.status,
    400,
    "Cannot set password on completed user without currentPassword"
  );
});

test("PATCH /users/:id returns multiple errors", async (t: Test) => {
  const { user: user1, session } = await createUser();
  const { user: user2 } = await createUser();

  const [response, body] = await patch(`/users/${user1.id}`, {
    body: {
      email: user2.email,
      currentPassword: "incorrectPassword",
      newPassword: "hunter3",
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 400);
  t.true(Array.isArray(body.errors) && body.errors.length === 2);
});

test("POST /users allows registration + design duplication", async (t: Test) => {
  const dOne = uuid.v4();
  const dTwo = uuid.v4();
  const dThree = uuid.v4();

  sandbox()
    .stub(Config, "DEFAULT_DESIGN_IDS")
    .value([dOne, dTwo, dThree].join(","));
  const mailchimpStub = sandbox()
    .stub(MailChimp, "subscribeToUsers")
    .returns(Promise.resolve());
  const duplicationStub = sandbox()
    .stub(DuplicationService, "duplicateDesigns")
    .callsFake(
      async (_: string, designIds: string[]): Promise<void> => {
        t.true(designIds.includes(dOne), "Contains first design id");
        t.true(designIds.includes(dTwo), "Contains second design id");
        t.true(designIds.includes(dThree), "Contains third design id");
      }
    );

  const [response, body] = await post("/users", {
    body: {
      email: "user@example.com",
      name: "Rick Owens",
      password: "rick_owens_la_4_lyfe",
      phone: "323 931 4960",
    },
  });

  t.equal(response.status, 201, "status=201");
  t.equal(body.name, "Rick Owens");
  t.equal(body.email, "user@example.com");
  t.equal(body.phone, "+13239314960");
  t.equal(body.password, undefined);
  t.equal(body.passwordHash, undefined);

  t.equal(
    duplicationStub.callCount,
    1,
    "Expect the duplication service to be called once"
  );
  t.equal(mailchimpStub.callCount, 1, "Expect mailchimp to be called once");
});

test("POST /users?initialDesigns= allows registration + design duplication", async (t: Test) => {
  const dOne = uuid.v4();
  const dTwo = uuid.v4();
  const dThree = uuid.v4();

  const mailchimpStub = sandbox()
    .stub(MailChimp, "subscribeToUsers")
    .returns(Promise.resolve());
  const duplicationStub = sandbox()
    .stub(DuplicationService, "duplicateDesigns")
    .callsFake(
      async (_: string, designIds: string[]): Promise<void> => {
        t.true(designIds.includes(dOne), "Contains first design id");
        t.true(designIds.includes(dTwo), "Contains second design id");
        t.true(designIds.includes(dThree), "Contains third design id");
      }
    );

  const [response, body] = await post(
    `/users?initialDesigns=${dOne}&initialDesigns=${dTwo}&initialDesigns=${dThree}`,
    {
      body: {
        email: "user@example.com",
        name: "Rick Owens",
        password: "rick_owens_la_4_lyfe",
        phone: "323 931 4960",
      },
    }
  );

  t.equal(response.status, 201, "status=201");
  t.equal(body.name, "Rick Owens");
  t.equal(body.email, "user@example.com");
  t.equal(body.phone, "+13239314960");
  t.equal(body.password, undefined);
  t.equal(body.passwordHash, undefined);

  t.equal(
    duplicationStub.callCount,
    1,
    "Expect the duplication service to be called once"
  );
  t.equal(mailchimpStub.callCount, 1, "Expect mailchimp to be called once");
});

test("POST /users?cohort allows registration + adding a cohort user", async (t: Test) => {
  const { mailchimpStub } = stubUserDependencies();

  const admin = await createUser({ role: "ADMIN" });
  const cohort = await CohortsDAO.create({
    createdBy: admin.user.id,
    description: "A bunch of delightful designers",
    id: uuid.v4(),
    slug: "moma-demo-june-2020",
    title: "MoMA Demo Participants",
  });

  const [response, newUser] = await post(`/users?cohort=${cohort.slug}`, {
    body: {
      email: "user@example.com",
      name: "Rick Owens",
      password: "rick_owens_la_4_lyfe",
      phone: "323 931 4960",
    },
  });
  const cohortUser = await CohortUsersDAO.findAllByUser(newUser.id);

  t.equal(response.status, 201, "status=201");
  t.equal(newUser.name, "Rick Owens");
  t.equal(newUser.email, "user@example.com");
  t.equal(newUser.phone, "+13239314960");
  t.equal(newUser.password, undefined);
  t.equal(newUser.passwordHash, undefined);

  t.equal(mailchimpStub.callCount, 1, "Expect mailchimp to be called once");
  t.deepEqual(
    mailchimpStub.firstCall.args[0],
    {
      cohort: "moma-demo-june-2020",
      email: newUser.email,
      name: newUser.name,
      referralCode: "n/a",
    },
    "Expect the correct tags for Mailchimp subscription"
  );
  t.deepEqual(
    cohortUser,
    [{ cohortId: cohort.id, userId: newUser.id }],
    "Creates a CohortUser"
  );
});

test("POST /users?promoCode=X applies a code at registration", async (t: Test) => {
  stubUserDependencies();

  const { user: adminUser } = await createUser({ role: "ADMIN" });

  await PromoCodesDAO.create({
    code: "newbie",
    codeExpiresAt: null,
    createdBy: adminUser.id,
    creditAmountCents: 1239,
    creditExpiresAt: null,
    isSingleUse: false,
  });

  const [response, newUser] = await post("/users?promoCode=newbie", {
    body: {
      email: "user@example.com",
      name: "Rick Owens",
      password: "rick_owens_la_4_lyfe",
      phone: "323 931 4960",
    },
  });

  t.equal(response.status, 201, "status=201");
  t.equal(await CreditsDAO.getCreditAmount(newUser.id), 1239);
});

test("GET /users?search with malformed RegExp throws 400", async (t: Test) => {
  const { session } = await createUser({ role: "ADMIN" });

  const [response, body] = await get("/users?search=(", {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 400);
  t.deepEqual(body, { message: "Search contained invalid characters" });
});

test("POST /users allows subscribing to a plan", async (t: Test) => {
  const { teamUsersStub } = stubUserDependencies();

  sandbox()
    .stub(attachSource, "default")
    .resolves({ id: "sourceId", last4: "1234" });

  sandbox().stub(createStripeSubscription, "default").resolves({
    id: "sub_123",
  });

  sandbox().stub(Stripe, "findOrCreateCustomerId").resolves("customerId");

  const plan = await db.transaction((trx: Knex.Transaction) =>
    PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      revenueShareBasisPoints: 5000,
      costOfGoodsShareBasisPoints: 0,
      stripePlanId: "plan_456",
      title: "Some More",
      isDefault: true,
      isPublic: false,
      ordering: null,
      description: null,
      baseCostPerBillingIntervalCents: 4567,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
    })
  );

  const [response, body] = await post("/users", {
    body: {
      ...USER_DATA,
      planId: plan.id,
      stripeCardToken: "tok_123",
    },
  });

  t.equal(response.status, 201);

  t.equal(teamUsersStub.callCount, 1, "Calls team user stub");
  t.equal(teamUsersStub.firstCall.args[1], body.email);
  t.equal(teamUsersStub.firstCall.args[2], body.id);

  await db.transaction(async (trx: Knex.Transaction) => {
    const subscriptions = await SubscriptionsDAO.findForUser(body.id, trx);
    t.equal(subscriptions.length, 1);
    t.equal(subscriptions[0].planId, plan.id);
    t.notEqual(subscriptions[0].paymentMethodId, null);
  });
});
