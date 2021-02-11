import uuid from "node-uuid";
import * as Fetch from "../fetch";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import generatePlan from "../../test-helpers/factories/plan";
import db from "../../services/db";
import TeamsDAO from "../../components/teams/dao";
import * as SubscriptionsDAO from "../../components/subscriptions/dao";
import { Subscription } from "../../components/subscriptions/domain-object";
import { TeamType } from "../../components/teams/types";
import { Plan } from "../../components/plans/types";
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
  const trx = await db.transaction();

  const stripeSubscriptionToUpdate: StripeSubscription = {
    id: stripeSubscriptionId,
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

  const oldPlan = await generatePlan(
    trx,
    {
      title: "Old Team Plan",
      maximumSeatsPerTeam: null,
    },
    [baseCostPrice, baseCostPrice2, perSeatPrice]
  );

  const newPlan = await generatePlan(
    trx,
    {
      title: "New team plan",
      maximumSeatsPerTeam: null,
      baseCostPerBillingIntervalCents: 2000,
      perSeatCostPerBillingIntervalCents: 500,
      ...newPlanData,
    },
    newPlanPrices !== null ? newPlanPrices : undefined
  );

  const team = await TeamsDAO.create(trx, {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    title: "A team",
    type: TeamType.DESIGNER,
  });

  const subscription = await SubscriptionsDAO.create(
    {
      id: uuid.v4(),
      cancelledAt: null,
      planId: oldPlan.id,
      paymentMethodId: null,
      stripeSubscriptionId,
      userId: null,
      teamId: team.id,
      isPaymentWaived: false,
      ...subscriptionData,
    },
    trx
  );

  return {
    trx,
    getStripeSubscriptionStub,
    updateStripeSubscriptionStub,
    oldPlan,
    newPlan,
    subscription,
    fetchStub,
    fakeFetchResponse,
  };
}

test("upgradeSubscription calls the correct api with correct prices to update", async (t: Test) => {
  const {
    trx,
    subscription,
    newPlan,
    getStripeSubscriptionStub,
    updateStripeSubscriptionStub,
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

  try {
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
      updateStripeSubscriptionStub.callCount,
      1,
      "calls update Stripe subscription"
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
  } finally {
    await trx.rollback();
  }
});

test("upgradeSubscription calls the correct api with proration 'create_prorations' if the plan we upgrade to is free", async (t: Test) => {
  const {
    trx,
    subscription,
    newPlan,
    getStripeSubscriptionStub,
    updateStripeSubscriptionStub,
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
    newPlanData: {
      baseCostPerBillingIntervalCents: 0,
      perSeatCostPerBillingIntervalCents: 0,
    },
  });

  try {
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
      updateStripeSubscriptionStub.callCount,
      1,
      "calls update Stripe subscription"
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
        proration_behavior: "create_prorations",
        default_source: stripeSourceId,
        payment_behavior: "error_if_incomplete",
      },
      "calls with the correct subscription data to update"
    );
  } finally {
    await trx.rollback();
  }
});

test("upgradeSubscription fail because the CALA subscription doesn't have Stripe subscription id", async (t: Test) => {
  const { trx, subscription, newPlan } = await setup({
    subscriptionData: {
      stripeSubscriptionId: null,
    },
    subscriptionItems: [],
    newPlanPrices: [baseCostPrice, baseCostPrice3, perSeatPrice],
  });

  try {
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
  } finally {
    await trx.rollback();
  }
});

test("upgradeSubscription fail because the CALA subscription doesn't have Stripe subscription id", async (t: Test) => {
  const { trx, subscription, newPlan } = await setup({
    subscriptionItems: [],
  });

  try {
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
  } finally {
    await trx.rollback();
  }
});

test("upgradeSubscription fail because new Cala plan has per_seat price but we pass null as a seatCount", async (t: Test) => {
  const { trx, subscription, newPlan } = await setup({
    newPlanPrices: [baseCostPrice, baseCostPrice3, perSeatPrice],
  });

  try {
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
  } finally {
    await trx.rollback();
  }
});

test("upgradeSubscription delete old plan prices and add new prices", async (t: Test) => {
  const {
    trx,
    subscription,
    newPlan,
    updateStripeSubscriptionStub,
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

  try {
    const seatCount = null;

    await upgradeSubscription({
      subscription,
      newPlan,
      seatCount,
      stripeSourceId,
    });

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
  } finally {
    await trx.rollback();
  }
});

test("upgradeSubscription skips prices identical in new and old plans and add new price", async (t: Test) => {
  const {
    trx,
    subscription,
    newPlan,
    updateStripeSubscriptionStub,
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

  try {
    const seatCount = null;

    await upgradeSubscription({
      subscription,
      newPlan,
      seatCount,
      stripeSourceId,
    });

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
  } finally {
    await trx.rollback();
  }
});

test("upgradeSubscription throws an error if plans prices are identical and there is nothing to call update with", async (t: Test) => {
  const { trx, subscription, newPlan } = await setup({
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
    newPlanPrices: [baseCostPrice, baseCostPrice2],
  });

  try {
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
        `No subscription items in plan with id ${newPlan.id} to upgrade Stripe subscription with id ${subscription.id}, Stripe subscription id ${subscription.stripeSubscriptionId}`,
        "throws with correct error message about the fact that there is no subscription items to update as plans prices are equal"
      );
    }
  } finally {
    await trx.rollback();
  }
});

test("upgradeSubscription calls the correct API", async (t: Test) => {
  const {
    trx,
    subscription,
    newPlan,
    updateStripeSubscriptionStub,
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

  try {
    const seatCount = 5;

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
      "fetch has been colled as post"
    );
    t.equal(
      fetchStub.firstCall.args[1].body,
      "items[0][id]=subscription-item-id-to-update&items[0][quantity]=5&items[0][price]=stripe-price-id-per-seat&items[1][price]=stripe-price-id-3&proration_behavior=always_invoice&payment_behavior=error_if_incomplete&default_source=stripe-source-id",
      "fetch has been called with correct arguments to update the stripe subscription"
    );
  } finally {
    await trx.rollback();
  }
});
