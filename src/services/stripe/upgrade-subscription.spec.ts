import * as Fetch from "../fetch";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import { generatePlanWithoutDB } from "../../test-helpers/factories/plan";
import { Subscription } from "../../components/subscriptions";
import { TeamDb, TeamType } from "../../components/teams/types";
import { Plan } from "../../components/plans";
import {
  PlanStripePriceType,
  PlanStripePrice,
} from "../../components/plan-stripe-price/types";

import upgradeSubscription from "./upgrade-subscription";
import * as StripeAPI from "./api";
import { Subscription as StripeSubscription, SubscriptionItem } from "./types";

const baseCostPrice = {
  stripePriceId: "stripe-price-id-1",
  type: PlanStripePriceType.BASE_COST,
};
const baseCostPrice2 = {
  stripePriceId: "stripe-price-id-2",
  type: PlanStripePriceType.BASE_COST,
};
const baseCostPrice3 = {
  stripePriceId: "stripe-price-id-3",
  type: PlanStripePriceType.BASE_COST,
};
const zeroBaseCostPrice = {
  stripePriceId: "stripe-free-price-id-1",
  type: PlanStripePriceType.BASE_COST,
};
const perSeatPrice = {
  stripePriceId: "stripe-price-id-per-seat",
  type: PlanStripePriceType.PER_SEAT,
};

const stripeSubscriptionId = "stripe-subscription-id";
const stripeSourceId = "stripe-source-id";

async function setup({
  subscriptionItems = [
    {
      id: "subscription-item-id-to-delete",
      price: {
        id: baseCostPrice2.stripePriceId,
      },
      quantity: 1,
    },
    {
      id: "subscription-item-id-to-leave",
      price: {
        id: baseCostPrice.stripePriceId,
      },
      quantity: 1,
    },
    {
      id: "subscription-item-id-to-update",
      price: {
        id: perSeatPrice.stripePriceId,
      },
      quantity: 2,
    },
  ],
  newPlanPrices = null,
  newPlanData = {},
  subscriptionData = {},
}: {
  subscriptionItems?: SubscriptionItem[];
  newPlanData?: Partial<Plan>;
  newPlanPrices?: Omit<PlanStripePrice, "planId">[] | null;
  subscriptionData?: Partial<Subscription>;
}) {
  const stripeSubscriptionToUpdate: StripeSubscription = {
    id: stripeSubscriptionId,
    latest_invoice: null,
    items: {
      object: "list",
      data: subscriptionItems,
    },
  };

  const getStripeSubscriptionStub = sandbox()
    .stub(StripeAPI, "getSubscription")
    .resolves(stripeSubscriptionToUpdate);
  const updateStripeSubscriptionStub = sandbox()
    .stub(StripeAPI, "updateSubscription")
    .resolves({});
  const retrieveUpcomingInvoiceStub = sandbox()
    .stub(StripeAPI, "retrieveUpcomingInvoice")
    .resolves({
      total: 200,
    });
  const fakeFetchResponse = {
    headers: {
      get(): string {
        return "application/json";
      },
    },
    status: 200,
    json(): object {
      return {
        id: "a-stripe-subscription-id",
        latest_invoice: null,
        items: {
          object: "list",
          data: [
            {
              id: "a-subscription-item-id",
              price: {
                id: "a-stripe-price-id",
              },
              quantity: 3,
            },
            {
              id: "another-subscription-item-id",
              price: {
                id: "another-stripe-price-id",
              },
              quantity: 0,
            },
          ],
        },
      };
    },
  };
  const fetchStub = sandbox().stub(Fetch, "fetch").resolves(fakeFetchResponse);

  const oldPlan = generatePlanWithoutDB(
    {
      id: "an-old-plan-id",
      title: "Old Team Plan",
      maximumSeatsPerTeam: null,
    },
    [baseCostPrice, baseCostPrice2, perSeatPrice]
  );

  const newPlan = generatePlanWithoutDB(
    {
      id: "a-new-plan-id",
      title: "New team plan",
      maximumSeatsPerTeam: null,
      baseCostPerBillingIntervalCents: 2000,
      perSeatCostPerBillingIntervalCents: 500,
      ...newPlanData,
    },
    newPlanPrices !== null ? newPlanPrices : undefined
  );

  const team: TeamDb = {
    id: "a-team-id",
    createdAt: new Date(),
    deletedAt: null,
    title: "A team",
    type: TeamType.DESIGNER,
  };

  const subscription: Subscription = Object.assign(
    {
      id: "a-current-subscription",
      createdAt: new Date(),
      cancelledAt: null,
      planId: oldPlan.id,
      paymentMethodId: "pm1",
      stripeSubscriptionId,
      isPaymentWaived: false,
      userId: null,
      teamId: team.id,
    },
    subscriptionData
  );

  return {
    getStripeSubscriptionStub,
    updateStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
    oldPlan,
    newPlan,
    subscription,
    fetchStub,
    fakeFetchResponse,
  };
}

test("upgradeSubscription calls the correct api with correct prices to update", async (t: Test) => {
  const {
    subscription,
    newPlan,
    getStripeSubscriptionStub,
    updateStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
  } = await setup({
    subscriptionItems: [
      {
        id: "subscription-item-id-to-delete",
        price: {
          id: baseCostPrice2.stripePriceId,
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-leave",
        price: {
          id: baseCostPrice.stripePriceId,
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-update",
        price: {
          id: perSeatPrice.stripePriceId,
        },
        quantity: 2,
      },
    ],
    newPlanPrices: [baseCostPrice, baseCostPrice3, perSeatPrice],
  });

  const seatCount = 4;
  await upgradeSubscription({
    subscription,
    newPlan,
    seatCount,
    stripeSourceId,
  });

  t.deepEqual(
    getStripeSubscriptionStub.callCount,
    1,
    "calls get Stripe subscription"
  );
  t.deepEqual(
    getStripeSubscriptionStub.args[0][0],
    stripeSubscriptionId,
    "calls get Stripe subscription with stripe id from the CALA subscription"
  );

  t.deepEqual(
    retrieveUpcomingInvoiceStub.args[0][0],
    {
      subscription: stripeSubscriptionId,
      subscription_items: [
        { deleted: true, id: "subscription-item-id-to-delete" }, // deleted because this item price doesn't exist in the new plan
        { price: baseCostPrice3.stripePriceId }, // new price from the new plan
        {
          id: "subscription-item-id-to-update",
          price: perSeatPrice.stripePriceId,
          quantity: seatCount,
        },
      ],
      subscription_proration_behavior: "always_invoice",
    },
    "retrieve upcoming invoice with correct args"
  );

  t.deepEqual(
    updateStripeSubscriptionStub.args[0][1],
    {
      items: [
        { deleted: true, id: "subscription-item-id-to-delete" }, // deleted because this item price doesn't exist in the new plan
        { price: baseCostPrice3.stripePriceId }, // new price from the new plan
        {
          id: "subscription-item-id-to-update",
          price: perSeatPrice.stripePriceId,
          quantity: seatCount,
        },
      ],
      proration_behavior: "always_invoice",
      default_source: stripeSourceId,
      payment_behavior: "error_if_incomplete",
    },
    "calls with the correct subscription data to update"
  );
});

test("upgradeSubscription calls the correct api with proration 'none' if the plan we upgrade to is free", async (t: Test) => {
  const {
    subscription,
    newPlan,
    getStripeSubscriptionStub,
    updateStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
  } = await setup({
    subscriptionItems: [
      {
        id: "subscription-item-id-to-delete",
        price: {
          id: baseCostPrice2.stripePriceId,
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-delete-2",
        price: {
          id: baseCostPrice.stripePriceId,
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-delete-3",
        price: {
          id: perSeatPrice.stripePriceId,
        },
        quantity: 2,
      },
    ],
    newPlanPrices: [zeroBaseCostPrice],
    newPlanData: {
      baseCostPerBillingIntervalCents: 0,
      perSeatCostPerBillingIntervalCents: 0,
    },
  });

  const seatCount = 4;
  await upgradeSubscription({
    subscription,
    newPlan,
    seatCount,
    stripeSourceId,
  });

  t.equal(
    getStripeSubscriptionStub.callCount,
    1,
    "calls get Stripe subscription"
  );
  t.deepEqual(
    getStripeSubscriptionStub.args[0][0],
    stripeSubscriptionId,
    "calls get Stripe subscription with stripe id from the CALA subscription"
  );

  t.equal(
    retrieveUpcomingInvoiceStub.callCount,
    0,
    "no need to retrieve upcoming invoice"
  );

  t.deepEqual(
    updateStripeSubscriptionStub.args[0][1],
    {
      items: [
        { deleted: true, id: "subscription-item-id-to-delete" }, // deleted because this item price doesn't exist in the new plan
        { deleted: true, id: "subscription-item-id-to-delete-2" },
        { deleted: true, id: "subscription-item-id-to-delete-3" },
        { price: zeroBaseCostPrice.stripePriceId }, // new price from the new plan
      ],
      proration_behavior: "none",
      default_source: stripeSourceId,
      payment_behavior: "error_if_incomplete",
    },
    "calls with the proration none and correct subscription data to update"
  );
});

test("upgradeSubscription fail because the CALA subscription doesn't have Stripe subscription id", async (t: Test) => {
  const {
    subscription,
    newPlan,
    getStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
    updateStripeSubscriptionStub,
  } = await setup({
    subscriptionData: {
      stripeSubscriptionId: null,
    },
    subscriptionItems: [],
    newPlanPrices: [baseCostPrice, baseCostPrice3, perSeatPrice],
  });

  const seatCount = 4;

  try {
    await upgradeSubscription({
      subscription,
      newPlan,
      seatCount,
      stripeSourceId,
    });
  } catch (err) {
    t.equal(
      err.message,
      `Subscription with id ${subscription.id} doesn't have associated stripe subscription id`,
      "throws correct error message about subscription which miss the stripe subscription id"
    );
  }

  t.equal(
    getStripeSubscriptionStub.callCount,
    0,
    "don't call for Stripe to get subscription information"
  );
  t.equal(
    retrieveUpcomingInvoiceStub.callCount,
    0,
    "don't call for Stripe to retrieve upcoming invoice information"
  );
  t.equal(
    updateStripeSubscriptionStub.callCount,
    0,
    "don't call for Stripe to update subscription"
  );
});

test("upgradeSubscription fail because the CALA subscription doesn't have Stripe subscription id", async (t: Test) => {
  const {
    subscription,
    newPlan,
    getStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
    updateStripeSubscriptionStub,
  } = await setup({
    subscriptionItems: [],
  });

  const seatCount = 4;

  try {
    await upgradeSubscription({
      subscription,
      newPlan: { ...newPlan, stripePrices: [] },
      seatCount,
      stripeSourceId,
    });
  } catch (err) {
    t.equal(
      err.message,
      `New plan with id ${newPlan.id} doesn't have stripe prices`,
      "throws correct error message about plan without stripe prices"
    );
  }

  t.equal(
    getStripeSubscriptionStub.callCount,
    0,
    "don't call for Stripe to get subscription information"
  );
  t.equal(
    retrieveUpcomingInvoiceStub.callCount,
    0,
    "don't call for Stripe to retrieve upcoming invoice information"
  );
  t.equal(
    updateStripeSubscriptionStub.callCount,
    0,
    "don't call for Stripe to update subscription"
  );
});

test("upgradeSubscription fail because new Cala plan has per_seat price but we pass null as a seatCount", async (t: Test) => {
  const {
    subscription,
    newPlan,
    getStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
    updateStripeSubscriptionStub,
  } = await setup({
    newPlanPrices: [baseCostPrice, baseCostPrice3, perSeatPrice],
  });

  const seatCount = null;

  try {
    await upgradeSubscription({
      subscription,
      newPlan,
      seatCount,
      stripeSourceId,
    });
  } catch (err) {
    t.equal(
      err.message,
      "Must pass non-null seatCount when plan includes a PER_SEAT price type",
      "throws correct error message about null seatCount"
    );
  }

  t.equal(
    getStripeSubscriptionStub.callCount,
    0,
    "don't call for Stripe to get subscription information"
  );
  t.equal(
    retrieveUpcomingInvoiceStub.callCount,
    0,
    "don't call for Stripe to retrieve upcoming invoice information"
  );
  t.equal(
    updateStripeSubscriptionStub.callCount,
    0,
    "don't call for Stripe to update subscription"
  );
});

test("upgradeSubscription delete old plan prices and add new prices", async (t: Test) => {
  const {
    subscription,
    newPlan,
    updateStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
  } = await setup({
    subscriptionItems: [
      {
        id: "subscription-item-id-to-delete-1",
        price: {
          id: "stripe-price-from-old-plan-1",
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-delete-2",
        price: {
          id: "stripe-price-from-old-plan-2",
        },
        quantity: 1,
      },
    ],
    newPlanPrices: [baseCostPrice, baseCostPrice2, baseCostPrice3],
  });

  const seatCount = null;

  await upgradeSubscription({
    subscription,
    newPlan,
    seatCount,
    stripeSourceId,
  });

  t.deepEqual(
    retrieveUpcomingInvoiceStub.args[0][0],
    {
      subscription: stripeSubscriptionId,
      subscription_items: [
        { deleted: true, id: "subscription-item-id-to-delete-1" },
        { deleted: true, id: "subscription-item-id-to-delete-2" },
        { price: baseCostPrice.stripePriceId },
        { price: baseCostPrice2.stripePriceId },
        { price: baseCostPrice3.stripePriceId },
      ],
      subscription_proration_behavior: "always_invoice",
    },
    "retrieve upcoming invoice with correct args"
  );

  t.deepEqual(
    updateStripeSubscriptionStub.args[0][1],
    {
      items: [
        { deleted: true, id: "subscription-item-id-to-delete-1" },
        { deleted: true, id: "subscription-item-id-to-delete-2" },
        { price: baseCostPrice.stripePriceId },
        { price: baseCostPrice2.stripePriceId },
        { price: baseCostPrice3.stripePriceId },
      ],
      proration_behavior: "always_invoice",
      default_source: stripeSourceId,
      payment_behavior: "error_if_incomplete",
    },
    "calls with the correct subscription items to delete"
  );
});

test("upgradeSubscription skips prices identical in new and old plans and add new price", async (t: Test) => {
  const {
    subscription,
    newPlan,
    updateStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
  } = await setup({
    subscriptionItems: [
      {
        id: "subscription-item-id-to-skip-1",
        price: {
          id: baseCostPrice.stripePriceId,
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-skip-2",
        price: {
          id: baseCostPrice2.stripePriceId,
        },
        quantity: 1,
      },
    ],
    newPlanPrices: [baseCostPrice, baseCostPrice2, baseCostPrice3],
  });

  const seatCount = null;

  await upgradeSubscription({
    subscription,
    newPlan,
    seatCount,
    stripeSourceId,
  });

  t.deepEqual(
    retrieveUpcomingInvoiceStub.args[0][0],
    {
      subscription: stripeSubscriptionId,
      subscription_items: [{ price: baseCostPrice3.stripePriceId }],
      subscription_proration_behavior: "always_invoice",
    },
    "retrieve upcoming invoice with correct args"
  );

  t.deepEqual(
    updateStripeSubscriptionStub.args[0][1],
    {
      items: [{ price: baseCostPrice3.stripePriceId }],
      proration_behavior: "always_invoice",
      default_source: stripeSourceId,
      payment_behavior: "error_if_incomplete",
    },
    "calls with the one new price to add without similar prices in old and new plans"
  );
});

test("upgradeSubscription supports stripeSourceId null and skips sending default source to Stripe", async (t: Test) => {
  const {
    subscription,
    newPlan,
    updateStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
  } = await setup({
    subscriptionItems: [
      {
        id: "subscription-item-id-to-skip-1",
        price: {
          id: baseCostPrice.stripePriceId,
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-skip-2",
        price: {
          id: baseCostPrice2.stripePriceId,
        },
        quantity: 1,
      },
    ],
    newPlanPrices: [baseCostPrice, baseCostPrice2, baseCostPrice3],
  });

  const seatCount = null;

  await upgradeSubscription({
    subscription,
    newPlan,
    seatCount,
    stripeSourceId: null,
  });

  t.deepEqual(
    retrieveUpcomingInvoiceStub.args[0][0],
    {
      subscription: stripeSubscriptionId,
      subscription_items: [{ price: baseCostPrice3.stripePriceId }],
      subscription_proration_behavior: "always_invoice",
    },
    "retrieve upcoming invoice with correct args"
  );

  t.deepEqual(
    updateStripeSubscriptionStub.args[0][1],
    {
      items: [{ price: baseCostPrice3.stripePriceId }],
      proration_behavior: "always_invoice",
      payment_behavior: "error_if_incomplete",
    },
    "calls with the one new price to add without similar prices in old and new plans"
  );
});

test("upgradeSubscription calls an API if plans prices are identical to update source", async (t: Test) => {
  const {
    subscription,
    newPlan,
    updateStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
    fetchStub,
  } = await setup({
    subscriptionItems: [
      {
        id: "subscription-item-id-to-skip-1",
        price: {
          id: baseCostPrice.stripePriceId,
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-skip-2",
        price: {
          id: baseCostPrice2.stripePriceId,
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-skip-3",
        price: {
          id: perSeatPrice.stripePriceId,
        },
        quantity: 1,
      },
    ],
    newPlanPrices: [baseCostPrice, baseCostPrice2, perSeatPrice],
  });

  const seatCount = 1;
  await upgradeSubscription({
    subscription,
    newPlan,
    seatCount,
    stripeSourceId,
  });

  t.equal(
    retrieveUpcomingInvoiceStub.callCount,
    0,
    "no need to retrieve upcoming invoice"
  );

  t.deepEqual(
    updateStripeSubscriptionStub.args[0][1],
    {
      items: [],
      default_source: stripeSourceId,
      payment_behavior: "error_if_incomplete",
      proration_behavior: "none",
    },
    "calls with correct args and with empty items array"
  );

  // check second time to check how we call fetch
  updateStripeSubscriptionStub.restore();
  await upgradeSubscription({
    subscription,
    newPlan,
    seatCount,
    stripeSourceId,
  });

  t.equal(fetchStub.callCount, 1, "fetch has been called");
  t.equal(
    fetchStub.firstCall.args[0],
    `https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`,
    "fetch has been called with correct link to Stripe subscription update"
  );
  t.equal(
    fetchStub.firstCall.args[1].method,
    "post",
    "fetch has been called as post"
  );
  t.equal(
    fetchStub.firstCall.args[1].body,
    "proration_behavior=none&payment_behavior=error_if_incomplete&default_source=stripe-source-id",
    "fetch has been called without items or proration_behavior as we updating source here"
  );
});

test("upgradeSubscription calls the correct API", async (t: Test) => {
  const {
    subscription,
    newPlan,
    updateStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
    fetchStub,
  } = await setup({
    subscriptionItems: [
      {
        id: "subscription-item-id-to-skip-1",
        price: {
          id: baseCostPrice.stripePriceId,
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-skip-2",
        price: {
          id: baseCostPrice2.stripePriceId,
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-update",
        price: {
          id: perSeatPrice.stripePriceId,
        },
        quantity: 2,
      },
    ],
    newPlanPrices: [
      baseCostPrice,
      baseCostPrice2,
      perSeatPrice,
      baseCostPrice3,
    ],
  });
  updateStripeSubscriptionStub.restore();

  const seatCount = 5;

  await upgradeSubscription({
    subscription,
    newPlan,
    seatCount,
    stripeSourceId,
  });

  t.deepEqual(
    retrieveUpcomingInvoiceStub.args[0][0],
    {
      subscription: stripeSubscriptionId,
      subscription_items: [
        {
          id: "subscription-item-id-to-update",
          price: perSeatPrice.stripePriceId,
          quantity: seatCount,
        },
        { price: baseCostPrice3.stripePriceId }, // new price from the new plan
      ],
      subscription_proration_behavior: "always_invoice",
    },
    "retrieve upcoming invoice with correct args"
  );

  t.equal(fetchStub.callCount, 1, "fetch has been called");
  t.equal(
    fetchStub.firstCall.args[0],
    `https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`,
    "fetch has been called with correct link to Stripe subscription update"
  );
  t.equal(
    fetchStub.firstCall.args[1].method,
    "post",
    "fetch has been called as post"
  );
  t.equal(
    fetchStub.firstCall.args[1].body,
    "items[0][id]=subscription-item-id-to-update&items[0][quantity]=5&items[0][price]=stripe-price-id-per-seat&items[1][price]=stripe-price-id-3&proration_behavior=always_invoice&payment_behavior=error_if_incomplete&default_source=stripe-source-id",
    "fetch has been called with correct arguments to update the stripe subscription"
  );
});

test("upgradeSubscription sets proration_behavior to `none` when we downgrade from paid plan to a cheaper paid plan", async (t: Test) => {
  const {
    subscription,
    newPlan,
    getStripeSubscriptionStub,
    updateStripeSubscriptionStub,
    retrieveUpcomingInvoiceStub,
  } = await setup({
    subscriptionItems: [
      {
        id: "subscription-item-id-to-delete",
        price: {
          id: baseCostPrice2.stripePriceId,
        },
        quantity: 1,
      },
      {
        id: "subscription-item-id-to-delete-2",
        price: {
          id: perSeatPrice.stripePriceId,
        },
        quantity: 2,
      },
    ],
    newPlanPrices: [baseCostPrice],
  });

  // means upcoming invoice is going to refund
  retrieveUpcomingInvoiceStub.resolves({ total: -100 });

  const seatCount = 4;
  await upgradeSubscription({
    subscription,
    newPlan,
    seatCount,
    stripeSourceId,
  });

  t.deepEqual(
    getStripeSubscriptionStub.args[0][0],
    stripeSubscriptionId,
    "calls get Stripe subscription with stripe id from the CALA subscription"
  );

  t.deepEqual(
    retrieveUpcomingInvoiceStub.args[0][0],
    {
      subscription: stripeSubscriptionId,
      subscription_items: [
        { deleted: true, id: "subscription-item-id-to-delete" }, // deleted because this item price doesn't exist in the new plan
        { deleted: true, id: "subscription-item-id-to-delete-2" },
        { price: baseCostPrice.stripePriceId }, // new price from the new plan
      ],
      subscription_proration_behavior: "always_invoice",
    },
    "retrieve upcoming invoice with correct args"
  );

  t.deepEqual(
    updateStripeSubscriptionStub.args[0][1],
    {
      items: [
        { deleted: true, id: "subscription-item-id-to-delete" }, // deleted because this item price doesn't exist in the new plan
        { deleted: true, id: "subscription-item-id-to-delete-2" },
        { price: baseCostPrice.stripePriceId }, // new price from the new plan
      ],
      proration_behavior: "none",
      default_source: stripeSourceId,
      payment_behavior: "error_if_incomplete",
    },
    "calls with the proration none as we don't want to refund and correct subscription data to update"
  );
});
