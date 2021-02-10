import Knex from "knex";
import uuid from "node-uuid";

import TeamUsersDAO from "../team-users/dao";
import * as PlansDAO from "../plans/dao";
import * as SubscriptionsDAO from "./dao";
import * as CreateStripeSubscription from "../../services/stripe/create-subscription";
import * as CreatePaymentMethod from "../payment-methods/create-payment-method";
import * as StripeService from "../../services/stripe";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import InvalidDataError from "../../errors/invalid-data";
import { PlanStripePriceType } from "../plan-stripe-price/types";

import { createSubscription } from "./create";

const options = {
  planId: "a-free-plan",
  stripeCardToken: null,
  userId: "a-user-id",
  teamId: null,
  isPaymentWaived: false,
};

function setup() {
  return {
    uuidStub: sandbox().stub(uuid, "v4").returns("a-uuid"),
    trx: (sandbox().stub() as unknown) as Knex.Transaction,
    findPlanStub: sandbox().stub(PlansDAO, "findById").resolves(),
    stripeCustomerStub: sandbox()
      .stub(StripeService, "findOrCreateCustomerId")
      .resolves("a-stripe-customer-id"),
    createPaymentStub: sandbox().stub(CreatePaymentMethod, "default").resolves({
      id: "a-payment-method-id",
      stripeSourceId: "a-stripe-source-id",
      stripeCustomerId: "a-stripe-customer-id",
    }),
    createStripeSubscriptionStub: sandbox()
      .stub(CreateStripeSubscription, "default")
      .resolves({
        id: "a-stripe-subscription-id",
      }),
    createStub: sandbox().stub(SubscriptionsDAO, "create").resolves({
      id: "a-subscription-id",
      stripeSubscriptionId: "a-stripe-subscription-id",
      paymentMethodId: "a-payment-method-id",
    }),
    teamUserCountStub: sandbox()
      .stub(TeamUsersDAO, "countBilledUsers")
      .resolves(2),
  };
}

test("createSubscription free plan", async (t: Test) => {
  const {
    findPlanStub,
    createStub,
    createPaymentStub,
    createStripeSubscriptionStub,
    stripeCustomerStub,
    trx,
  } = setup();
  findPlanStub.resolves({
    baseCostPerBillingIntervalCents: 0,
    perSeatCostPerBillingIntervalCents: 0,
    stripePrices: [
      {
        planId: "a-free-plan",
        stripePriceId: "a-stripe-price-id",
        type: PlanStripePriceType.BASE_COST,
      },
    ],
  });

  await createSubscription(trx, options);

  t.deepEqual(
    stripeCustomerStub.args,
    [["a-user-id", trx]],
    "looks up Stripe customer since no payment method is created"
  );
  t.deepEqual(
    findPlanStub.args,
    [[trx, "a-free-plan"]],
    "looks up plan by plan ID"
  );
  t.equal(createPaymentStub.callCount, 0, "does not create a payment method");
  t.deepEqual(
    createStripeSubscriptionStub.args,
    [
      [
        {
          stripeCustomerId: "a-stripe-customer-id",
          stripeSourceId: null,
          seatCount: null,
          stripePrices: [
            {
              planId: "a-free-plan",
              stripePriceId: "a-stripe-price-id",
              type: PlanStripePriceType.BASE_COST,
            },
          ],
        },
      ],
    ],
    "creates a stripe subscription"
  );
  t.deepEqual(
    createStub.args,
    [
      [
        {
          cancelledAt: null,
          id: "a-uuid",
          isPaymentWaived: false,
          paymentMethodId: null,
          planId: "a-free-plan",
          stripeSubscriptionId: "a-stripe-subscription-id",
          userId: "a-user-id",
          teamId: null,
        },
        trx,
      ],
    ],
    "creates a subscription"
  );
});

test("createSubscription paid plan but waived payment", async (t: Test) => {
  const {
    findPlanStub,
    createStub,
    createPaymentStub,
    createStripeSubscriptionStub,
    trx,
  } = setup();
  findPlanStub.resolves({
    baseCostPerBillingIntervalCents: 10,
    perSeatCostPerBillingIntervalCents: 100,
    stripePrices: [
      {
        planId: "a-paid-plan",
        stripePriceId: "a-stripe-price-id",
        type: PlanStripePriceType.BASE_COST,
      },
    ],
  });

  await createSubscription(trx, {
    ...options,
    planId: "a-paid-plan",
    isPaymentWaived: true,
  });

  t.deepEqual(
    findPlanStub.args,
    [[trx, "a-paid-plan"]],
    "looks up plan by plan ID"
  );
  t.equal(createPaymentStub.callCount, 0, "does not create a payment method");
  t.deepEqual(
    createStripeSubscriptionStub.args,
    [
      [
        {
          seatCount: null,
          stripeCustomerId: "a-stripe-customer-id",
          stripeSourceId: null,
          stripePrices: [
            {
              planId: "a-paid-plan",
              stripePriceId: "a-stripe-price-id",
              type: PlanStripePriceType.BASE_COST,
            },
          ],
        },
      ],
    ],
    "creates a stripe subscription"
  );
  t.deepEqual(
    createStub.args,
    [
      [
        {
          cancelledAt: null,
          id: "a-uuid",
          isPaymentWaived: true,
          paymentMethodId: null,
          planId: "a-paid-plan",
          stripeSubscriptionId: "a-stripe-subscription-id",
          userId: "a-user-id",
          teamId: null,
        },
        trx,
      ],
    ],
    "creates a subscription"
  );
});

test("createSubscription paid plan", async (t: Test) => {
  const {
    findPlanStub,
    createStub,
    createPaymentStub,
    createStripeSubscriptionStub,
    stripeCustomerStub,
    trx,
  } = setup();
  findPlanStub.resolves({
    baseCostPerBillingIntervalCents: 10,
    perSeatCostPerBillingIntervalCents: 100,
    stripePrices: [
      {
        planId: "a-paid-plan",
        stripePriceId: "a-stripe-price-id",
        type: PlanStripePriceType.BASE_COST,
      },
    ],
  });

  try {
    await createSubscription(trx, {
      ...options,
      planId: "a-paid-plan",
    });
    t.fail();
  } catch (err) {
    t.deepEqual(err, new InvalidDataError("Missing stripe card token"));
  }

  sandbox().resetHistory();

  await createSubscription(trx, {
    ...options,
    planId: "a-paid-plan",
    stripeCardToken: "a-stripe-card-token",
  });

  t.deepEqual(
    findPlanStub.args,
    [[trx, "a-paid-plan"]],
    "looks up plan by plan ID"
  );
  t.deepEqual(
    createPaymentStub.args,
    [[{ token: "a-stripe-card-token", trx, userId: "a-user-id" }]],
    "creates a payment method"
  );
  t.equal(
    stripeCustomerStub.callCount,
    0,
    "Does not lookup customer from stripe when creating a payment method"
  );
  t.deepEqual(
    createStripeSubscriptionStub.args,
    [
      [
        {
          seatCount: null,
          stripeCustomerId: "a-stripe-customer-id",
          stripeSourceId: "a-stripe-source-id",
          stripePrices: [
            {
              planId: "a-paid-plan",
              stripePriceId: "a-stripe-price-id",
              type: PlanStripePriceType.BASE_COST,
            },
          ],
        },
      ],
    ],
    "creates a stripe subscription"
  );
  t.deepEqual(
    createStub.args,
    [
      [
        {
          cancelledAt: null,
          id: "a-uuid",
          isPaymentWaived: false,
          paymentMethodId: "a-payment-method-id",
          planId: "a-paid-plan",
          stripeSubscriptionId: "a-stripe-subscription-id",
          userId: "a-user-id",
          teamId: null,
        },
        trx,
      ],
    ],
    "creates a subscription"
  );
});

test("createSubscription paid plan for a team", async (t: Test) => {
  const {
    findPlanStub,
    createStub,
    createPaymentStub,
    createStripeSubscriptionStub,
    stripeCustomerStub,
    trx,
  } = setup();
  findPlanStub.resolves({
    baseCostPerBillingIntervalCents: 10,
    perSeatCostPerBillingIntervalCents: 100,
    stripePrices: [
      {
        planId: "a-paid-plan",
        stripePriceId: "a-stripe-price-id",
        type: PlanStripePriceType.BASE_COST,
      },
    ],
  });

  try {
    await createSubscription(trx, {
      ...options,
      planId: "a-paid-plan",
      teamId: "a-team-id",
    });
    t.fail();
  } catch (err) {
    t.deepEqual(err, new InvalidDataError("Missing stripe card token"));
  }

  sandbox().resetHistory();

  await createSubscription(trx, {
    ...options,
    planId: "a-paid-plan",
    stripeCardToken: "a-stripe-card-token",
    teamId: "a-team-id",
  });

  t.deepEqual(
    findPlanStub.args,
    [[trx, "a-paid-plan"]],
    "looks up plan by plan ID"
  );
  t.deepEqual(
    createPaymentStub.args,
    [[{ token: "a-stripe-card-token", trx, userId: "a-user-id" }]],
    "creates a payment method"
  );
  t.equal(
    stripeCustomerStub.callCount,
    0,
    "Does not lookup customer from stripe when creating a payment method"
  );
  t.deepEqual(
    createStripeSubscriptionStub.args,
    [
      [
        {
          seatCount: 2,
          stripeCustomerId: "a-stripe-customer-id",
          stripeSourceId: "a-stripe-source-id",
          stripePrices: [
            {
              planId: "a-paid-plan",
              stripePriceId: "a-stripe-price-id",
              type: PlanStripePriceType.BASE_COST,
            },
          ],
        },
      ],
    ],
    "creates a stripe subscription"
  );
  t.deepEqual(
    createStub.args,
    [
      [
        {
          cancelledAt: null,
          id: "a-uuid",
          isPaymentWaived: false,
          paymentMethodId: "a-payment-method-id",
          planId: "a-paid-plan",
          stripeSubscriptionId: "a-stripe-subscription-id",
          userId: null,
          teamId: "a-team-id",
        },
        trx,
      ],
    ],
    "creates a subscription"
  );
});
