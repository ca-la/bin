import uuid from "node-uuid";
import Knex from "knex";

import * as attachPlan from "./attach-plan";
import * as attachSource from "../../services/stripe/attach-source";
import * as createStripeSubscription from "../../services/stripe/create-subscription";
import * as PlansDAO from "../plans/dao";
import * as SubscriptionsDAO from "./dao";
import createUser = require("../../test-helpers/create-user");
import db from "../../services/db";
import PaymentMethodsDAO = require("../payment-methods/dao");
import Session = require("../../domain-objects/session");
import Stripe = require("../../services/stripe");
import User from "../users/domain-object";
import { authHeader, get, patch, post, put } from "../../test-helpers/http";
import { Plan } from "../plans/domain-object";
import { sandbox, test, Test } from "../../test-helpers/fresh";

interface SetupOptions {
  planOptions?: Partial<Uninserted<Plan>>;
}

async function setup(
  options: SetupOptions = {}
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

  sandbox().stub(Stripe, "findOrCreateCustomerId").resolves("customerId");

  const { session, user } = await createUser();
  const { planOptions } = options;
  const plan = await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: "MONTHLY",
    monthlyCostCents: 4567,
    revenueSharePercentage: 50,
    stripePlanId: "plan_456",
    title: "Some More",
    isDefault: true,
    isPublic: false,
    ordering: null,
    description: null,
    ...planOptions,
  });

  return { session, user, plan };
}

test("GET /subscriptions lists current subscriptions", async (t: Test) => {
  const { plan, user, session } = await setup();

  const id = await db.transaction(async (trx: Knex.Transaction) => {
    const paymentMethod = await PaymentMethodsDAO.create({
      userId: user.id,
      stripeCustomerId: "customer1",
      stripeSourceId: "source1",
      lastFourDigits: "1234",
    });

    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: user.id,
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

test("POST /subscriptions creates a subscription", async (t: Test) => {
  const { plan, session } = await setup();

  const [res, body] = await post("/subscriptions", {
    headers: authHeader(session.id),
    body: {
      planId: plan.id,
      stripeCardToken: "tok_123",
    },
  });

  t.equal(res.status, 201);
  t.equal(body.planId, plan.id);
  t.notEqual(body.paymentMethodId, null);
});

test("POST /subscriptions does not allow waiving payment on subscriptions for non-admins", async (t: Test) => {
  const { plan, session } = await setup();

  const [failedPaymentWaiving] = await post("/subscriptions", {
    headers: authHeader(session.id),
    body: {
      planId: plan.id,
      stripeCardToken: "123",
      isPaymentWaived: true,
    },
  });

  t.equal(failedPaymentWaiving.status, 403);

  const [missingStripeToken] = await post("/subscriptions", {
    headers: authHeader(session.id),
    body: {
      planId: plan.id,
    },
  });
  t.equal(missingStripeToken.status, 400);
});

test("POST /subscriptions allows omitting stripe info if the plan is free", async (t: Test) => {
  const { plan, session } = await setup({
    planOptions: {
      monthlyCostCents: 0,
    },
  });
  const [res, body] = await post("/subscriptions", {
    headers: authHeader(session.id),
    body: {
      planId: plan.id,
    },
  });

  t.equal(res.status, 201);
  t.equal(body.planId, plan.id);
  t.equal(body.paymentMethodId, null);
  t.equal(body.isPaymentWaived, false);
});

test("POST /subscriptions allows waiving payment on subscrixptions by admins", async (t: Test) => {
  const { plan, user } = await setup();

  const { session } = await createUser({ role: "ADMIN" });

  const [res, body] = await post("/subscriptions", {
    headers: authHeader(session.id),
    body: {
      planId: plan.id,
      isPaymentWaived: true,
      userId: user.id,
    },
  });

  t.equal(res.status, 201);
  t.equal(body.planId, plan.id);
  t.equal(body.userId, user.id);
  t.equal(body.paymentMethodId, null);
  t.equal(body.isPaymentWaived, true);
});

test("PUT /subscriptions updates a subscription", async (t: Test) => {
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
        isPaymentWaived: false,
      },
      trx
    );

    id = subscription.id;
  });

  const [res, body] = await put(`/subscriptions/${id}`, {
    headers: authHeader(session.id),
    body: {
      planId: plan.id,
      stripeCardToken: "tok_123",
    },
  });

  t.equal(res.status, 200);
  t.notEqual(body.paymentMethodId, null);
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
