import { Plan } from "../../components/plans/types";
import {
  PlanStripePrice,
  PlanStripePriceType,
} from "../../components/plan-stripe-price/types";
import {
  SubscriptionItem as StripeSubscriptionItem,
  Subscription as StripeSubscription,
  ProrationBehaviour,
} from "./types";
import {
  getSubscription as getStripeSubscription,
  updateSubscription as updateStripeSubscription,
  SubscriptionUpdate,
  SubscriptionItemUpdate as StripeSubscriptionItemToUpdate,
  retrieveUpcomingInvoice,
  StripeInvoice,
} from "./api";

function hasPerSeatPriceWithoutSeatCount(
  stripePrices: PlanStripePrice[],
  seatCount: null | number
): seatCount is null {
  const hasPerSeatPrice = stripePrices.some(
    (stripePrice: PlanStripePrice) =>
      stripePrice.type === PlanStripePriceType.PER_SEAT
  );
  return hasPerSeatPrice && seatCount === null;
}

async function getProrationBehaviour(
  subscriptionId: string,
  request: SubscriptionUpdate,
  newPlan: Plan
): Promise<{
  upcomingInvoice: StripeInvoice | null;
  prorationBehavior: ProrationBehaviour;
}> {
  // use this as a way to update source (card information)
  const plansPricesAreIdentical = request.items.length === 0;
  const isFreePlan =
    newPlan.baseCostPerBillingIntervalCents === 0 &&
    newPlan.perSeatCostPerBillingIntervalCents === 0;

  const isNoProration = plansPricesAreIdentical || isFreePlan;
  if (isNoProration) {
    return { prorationBehavior: "none", upcomingInvoice: null };
  }
  const todayAtMidnightUtc = new Date();
  todayAtMidnightUtc.setUTCHours(0);
  todayAtMidnightUtc.setUTCMinutes(0);
  todayAtMidnightUtc.setUTCSeconds(0);
  todayAtMidnightUtc.setUTCMilliseconds(0);

  const upcomingInvoice = await retrieveUpcomingInvoice({
    subscription: subscriptionId,
    subscription_items: request.items,
    subscription_proration_behavior: request.proration_behavior,
    subscription_proration_date: todayAtMidnightUtc,
  });

  const isRefundOrPlanIsFree = upcomingInvoice.total <= 0;

  return {
    prorationBehavior: isRefundOrPlanIsFree ? "none" : "always_invoice",
    upcomingInvoice,
  };
}

export async function prepareUpgrade({
  stripeSubscriptionId,
  newPlan,
  seatCount,
}: {
  stripeSubscriptionId: string;
  newPlan: Plan;
  seatCount: number | null;
}): Promise<{
  updateRequest: SubscriptionUpdate;
  upcomingInvoice: StripeInvoice | null;
}> {
  if (newPlan.stripePrices.length === 0) {
    throw new Error(
      `New plan with id ${newPlan.id} doesn't have stripe prices`
    );
  }

  if (hasPerSeatPriceWithoutSeatCount(newPlan.stripePrices, seatCount)) {
    throw new Error(
      "Must pass non-null seatCount when plan includes a PER_SEAT price type"
    );
  }

  // retrieve the Stripe subscription
  const stripeSubscription = await getStripeSubscription(stripeSubscriptionId);

  // prepare Stripe subscriptionItems to update with new plan prices
  // find all items those stripe prices we don't have in the new plan and set their object property deleted: true
  const subscriptionItemsToDelete: StripeSubscriptionItemToUpdate[] = stripeSubscription.items.data
    .filter((subscriptionItem: StripeSubscriptionItem) => {
      const newPriceIsInTheSubscription = newPlan.stripePrices.find(
        (price: PlanStripePrice) =>
          price.stripePriceId === subscriptionItem.price.id
      );
      return !newPriceIsInTheSubscription;
    })
    .map((subscriptionItem: StripeSubscriptionItem) => {
      return {
        id: subscriptionItem.id,
        deleted: true,
      };
    });

  // go through all prices from new plan and add unique prices to the subscription
  const newStripeSubscriptionItems: StripeSubscriptionItemToUpdate[] = [];
  for (const newStripePrice of newPlan.stripePrices) {
    const newStripePriceInOldSubscription = stripeSubscription.items.data.find(
      (subscriptionItem: StripeSubscriptionItem) =>
        subscriptionItem.price.id === newStripePrice.stripePriceId
    );

    const hasPerSeatPrice =
      newStripePrice.type === PlanStripePriceType.PER_SEAT;

    // if price is from the old subscription and it's not a per seat - go for next one
    if (newStripePriceInOldSubscription && !hasPerSeatPrice) {
      continue;
    } else if (newStripePriceInOldSubscription && hasPerSeatPrice) {
      if (newStripePriceInOldSubscription.quantity === seatCount) {
        continue;
      } else {
        newStripeSubscriptionItems.push({
          id: newStripePriceInOldSubscription.id,
          price: newStripePrice.stripePriceId,
          quantity: seatCount,
        });
      }
    } else {
      // if price is not from the old subscription - add to the list of subscription items
      newStripeSubscriptionItems.push({
        price: newStripePrice.stripePriceId,
        ...(hasPerSeatPrice ? { quantity: seatCount } : null),
      });
    }
  }

  // combine list of new subscription items with the list of deleted items
  const newSubscriptionItems = [
    ...subscriptionItemsToDelete,
    ...newStripeSubscriptionItems,
  ];

  const initialRequest: SubscriptionUpdate = {
    items: newSubscriptionItems,
    proration_behavior: "always_invoice",
    payment_behavior: "error_if_incomplete",
  };

  const { prorationBehavior, upcomingInvoice } = await getProrationBehaviour(
    stripeSubscriptionId,
    initialRequest,
    newPlan
  );

  return {
    updateRequest: {
      ...initialRequest,
      proration_behavior: prorationBehavior,
      ...(upcomingInvoice
        ? { proration_date: upcomingInvoice.subscription_proration_date }
        : null),
    },
    upcomingInvoice,
  };
}

export async function upgradeSubscription({
  stripeSubscriptionId,
  newPlan,
  seatCount,
  stripeSourceId,
}: {
  stripeSubscriptionId: string;
  newPlan: Plan;
  seatCount: number | null;
  stripeSourceId: string | null;
}): Promise<StripeSubscription> {
  const { updateRequest } = await prepareUpgrade({
    stripeSubscriptionId,
    newPlan,
    seatCount,
  });

  const updatedStripeSubscription = await updateStripeSubscription(
    stripeSubscriptionId,
    {
      ...updateRequest,
      ...(stripeSourceId ? { default_source: stripeSourceId } : null),
    }
  );

  return updatedStripeSubscription;
}
