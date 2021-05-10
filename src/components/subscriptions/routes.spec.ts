import uuid from "node-uuid";
import Knex from "knex";

import * as attachPlan from "./attach-plan";
import * as attachSource from "../../services/stripe/attach-source";
import * as createStripeSubscription from "../../services/stripe/create-subscription";
import * as SubscriptionsDAO from "./dao";
import createUser from "../../test-helpers/create-user";
import db from "../../services/db";
import Session = require("../../domain-objects/session");
import Stripe = require("../../services/stripe");
import User, { Role } from "../users/domain-object";
import { authHeader, get, patch } from "../../test-helpers/http";
import { Plan, BillingInterval } from "../plans/types";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import generatePlan from "../../test-helpers/factories/plan";
import { generatePaymentMethod } from "../../test-helpers/factories/payment-method";
import { customerTestBlank } from "../customers/types";

interface SetupOptions {
  planOptions?: Partial<Uninserted<Plan>>;
  role: Role;
}

async function setup(
  options: SetupOptions = { role: "USER" }
): Promise<{
  session: Session;
  user: User;
  plan: Plan;
}> {
  sandbox().stub(createStripeSubscription, "default").resolves({
    id: "sub_123",
  });

  sandbox()
    .stub(attachSource, "default")
    .resolves({ id: "sourceId", last4: "1234" });

  sandbox().stub(Stripe, "findOrCreateCustomer").resolves(customerTestBlank);

  const { planOptions } = options;
  const { session, user } = await createUser();

  const plan = await db.transaction((trx: Knex.Transaction) =>
    generatePlan(trx, {
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
      maximumCollections: null,
      includesFulfillment: true,
      upgradeToPlanId: null,
      ...planOptions,
    })
  );

  return { session, user, plan };
}

test("GET /subscriptions lists current subscriptions", async (t: Test) => {
  const { plan, user, session } = await setup();

  const id = await db.transaction(async (trx: Knex.Transaction) => {
    const { paymentMethod } = await generatePaymentMethod(trx, {
      userId: user.id,
      teamId: null,
    });

    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: user.id,
        teamId: null,
        isPaymentWaived: false,
      },
      trx
    );

    return subscription.id;
  });

  const [res, body] = await get(`/subscriptions?userId=${user.id}`, {
    headers: authHeader(session.id),
  });

  t.equal(res.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].id, id);
  t.equal(body[0].plan.title, "Some More");
});

test("GET /subscriptions?isActive=true lists active subscriptions", async (t: Test) => {
  const { user, session } = await createUser();

  const findStub = sandbox()
    .stub(SubscriptionsDAO, "findActive")
    .resolves([{ id: "sub1" }]);
  sandbox()
    .stub(attachPlan, "default")
    .callsFake((x: any) => x);

  const [res, body] = await get(
    `/subscriptions?userId=${user.id}&isActive=true`,
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(res.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].id, "sub1");
  t.equal(findStub.callCount, 1);
  t.equal(findStub.firstCall.args[0], user.id);
});

test("GET /subscriptions?teamId lists a teams subscriptions for admins", async (t: Test) => {
  const { session } = await createUser({ role: "ADMIN" });

  const findStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([{ id: "sub1" }]);
  const [res, body] = await get("/subscriptions?teamId=aTeamId", {
    headers: authHeader(session.id),
  });

  t.equal(res.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].id, "sub1");
  t.equal(findStub.callCount, 1);
  t.equal(findStub.firstCall.args[1], "aTeamId");
});

test("GET /subscriptions?teamId denies access to non-admins", async (t: Test) => {
  const { session } = await createUser();

  const [res] = await get("/subscriptions?teamId=aTeamId", {
    headers: authHeader(session.id),
  });

  t.equal(res.status, 403, "Non-admin cannot get list of team subscriptions");
});

test("PATCH /subscriptions/:id cancels a subscription", async (t: Test) => {
  const { plan, user, session } = await setup();

  let id;
  await db.transaction(async (trx: Knex.Transaction) => {
    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: null,
        stripeSubscriptionId: "123",
        userId: user.id,
        teamId: null,
        isPaymentWaived: false,
      },
      trx
    );

    id = subscription.id;
  });

  const [nonAdminRes] = await patch(`/subscriptions/${id}`, {
    headers: authHeader(session.id),
    body: {
      cancelledAt: new Date(2020, 6, 21).toISOString(),
    },
  });

  t.equal(nonAdminRes.status, 403, "Non admins cannot cancel subscriptions");

  const { session: adminSession } = await createUser({ role: "ADMIN" });
  const [adminRes, body] = await patch(`/subscriptions/${id}`, {
    headers: authHeader(adminSession.id),
    body: {
      cancelledAt: new Date(2020, 6, 21).toISOString(),
    },
  });

  t.equal(adminRes.status, 200, "Admin can cancel subscriptions");
  t.equal(
    body.cancelledAt,
    new Date(2020, 6, 21).toISOString(),
    "Subscription is cancelledAt the requested time"
  );
});
