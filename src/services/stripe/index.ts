import Knex from "knex";
import { insecureHash } from "../insecure-hash";
import PaymentMethodsDAO from "../../components/payment-methods/dao";
import * as UsersDAO from "../../components/users/dao";
import TeamUsersDAO from "../../components/team-users/dao";
import * as SubscriptionsDAO from "../../components/subscriptions/dao";
import {
  PlanStripePrice,
  PlanStripePriceType,
} from "../../components/plan-stripe-price/types";

import {
  Charge,
  ConnectAccount,
  Customer,
  SourceTypes,
  SubscriptionItem,
  Transfer,
} from "./types";
import * as StripeAPI from "./api";

export * from "./types";

interface StripeChargeOptions {
  customerId: string;
  sourceId: string;
  amountCents: number;
  description: string;
  invoiceId: string;
}

export async function charge(options: StripeChargeOptions): Promise<Charge> {
  const { customerId, sourceId, amountCents, description, invoiceId } = options;

  // Using a combination of invoiceId + sourceId ensures that:
  // - We can't charge the same card for the same invoice twice in rapid succesion
  // - Switching sources lets you try again
  //
  // TBD if we need a better solution here but this seems ~fine for now.
  const idempotencyKey = insecureHash(
    `${invoiceId}/${sourceId}/${amountCents}`
  );

  return StripeAPI.createCharge(idempotencyKey, {
    amount: amountCents,
    currency: "usd",
    source: sourceId,
    description,
    customer: customerId,
    transfer_group: invoiceId,
  });
}

interface StripeTransferOptions {
  destination: string;
  amountCents: number;
  description: string;
  bidId: string | null;
  invoiceId: string | null;
  sourceType?: string;
}

export async function sendTransfer(
  options: StripeTransferOptions
): Promise<Transfer> {
  const { description, bidId, destination, amountCents, invoiceId } = options;
  if (!invoiceId && !bidId) {
    throw new Error(`A Bid or Invoice ID is required`);
  }
  const idempotencyKey = insecureHash(
    `${description}-${bidId || invoiceId}-${destination}`
  );

  return StripeAPI.createTransfer(idempotencyKey, {
    amount: amountCents,
    currency: "usd",
    destination,
    description,
    transfer_group: bidId || invoiceId,
    source_type: options.sourceType,
  });
}

export async function findCustomer(email: string): Promise<Customer | null> {
  const found = await StripeAPI.findCustomersByEmail({ email, limit: 1 });

  if (found.data.length === 0) {
    return null;
  }

  return found.data[0];
}

export async function findOrCreateCustomerId(
  userId: string,
  trx: Knex.Transaction
): Promise<string> {
  const existingPaymentMethods = await PaymentMethodsDAO.findByUserId(
    userId,
    trx
  );
  if (existingPaymentMethods.length > 0) {
    return existingPaymentMethods[0].stripeCustomerId;
  }

  const user = await UsersDAO.findById(userId, trx);

  if (!user) {
    throw new Error(`Invalid user ID: ${userId}`);
  }
  if (!user.email) {
    throw new Error(
      `Email is required to create stripe customer for User ${user.id}`
    );
  }

  const existingCustomer = await findCustomer(user.email);

  if (existingCustomer) {
    return existingCustomer.id;
  }

  const customer = await StripeAPI.createCustomer({
    description: user.name || "",
    email: user.email,
  });
  return customer.id;
}

// https://stripe.com/docs/connect/express-accounts#token-request
export async function createConnectAccount(
  code: string
): Promise<ConnectAccount> {
  return StripeAPI.createConnectAccount({
    code,
  });
}

export async function createLoginLink(accountId: string): Promise<string> {
  try {
    const response = await StripeAPI.createLoginLink({ accountId });

    return response.url;
  } catch (err) {
    if (err.message.indexOf("not an Express account") > -1) {
      return "https://dashboard.stripe.com/";
    }

    throw err;
  }
}

export async function getBalances(): Promise<SourceTypes> {
  const response = await StripeAPI.getBalances();

  return response.available[0].source_types;
}

async function getStripePerSeat(
  trx: Knex.Transaction,
  teamId: string
): Promise<SubscriptionItem | null> {
  const teamSubscriptions = await SubscriptionsDAO.findForTeamWithPlans(
    trx,
    teamId,
    {
      isActive: true,
    }
  );

  if (teamSubscriptions.length === 0) {
    throw new Error(`Could not find a subscription for team with ID ${teamId}`);
  }

  const subscription = teamSubscriptions[0];

  if (subscription.stripeSubscriptionId === null) {
    throw new Error(
      `Could not find a stripe subscription for subscription with ID ${subscription.id}`
    );
  }

  const perSeatPrice = subscription.plan.stripePrices.find(
    (stripePrice: PlanStripePrice) =>
      stripePrice.type === PlanStripePriceType.PER_SEAT
  );

  if (!perSeatPrice) {
    return null;
  }

  const stripeSubscription = await StripeAPI.getSubscription(
    subscription.stripeSubscriptionId
  );
  const perSeatSubscriptionItem = stripeSubscription.items.data.find(
    (subscriptionItem: SubscriptionItem) =>
      subscriptionItem.price.id === perSeatPrice.stripePriceId
  );

  if (!perSeatSubscriptionItem) {
    throw new Error(
      `Could not find a PER_SEAT subscription item with price ID ${perSeatPrice.stripePriceId}`
    );
  }

  return perSeatSubscriptionItem;
}

export async function addSeatCharge(
  trx: Knex.Transaction,
  teamId: string
): Promise<void> {
  const perSeatSubscriptionItem = await getStripePerSeat(trx, teamId);

  if (!perSeatSubscriptionItem) {
    return;
  }

  const currentNonViewerCount = await TeamUsersDAO.countBilledUsers(
    trx,
    teamId
  );

  if (currentNonViewerCount !== perSeatSubscriptionItem.quantity + 1) {
    throw new Error(
      "Stripe quantity does not match current non-viewer seat count."
    );
  }

  await StripeAPI.updateStripeSubscriptionItem(perSeatSubscriptionItem.id, {
    quantity: currentNonViewerCount,
    proration_behavior: "always_invoice",
    payment_behavior: "error_if_incomplete",
  });
}

export async function removeSeatCharge(
  trx: Knex.Transaction,
  teamId: string
): Promise<void> {
  const perSeatSubscriptionItem = await getStripePerSeat(trx, teamId);

  if (!perSeatSubscriptionItem) {
    return;
  }

  const currentBilledUserCount = await TeamUsersDAO.countBilledUsers(
    trx,
    teamId
  );

  if (currentBilledUserCount !== perSeatSubscriptionItem.quantity - 1) {
    throw new Error(
      "Stripe quantity does not match current non-viewer seat count."
    );
  }

  await StripeAPI.updateStripeSubscriptionItem(perSeatSubscriptionItem.id, {
    quantity: currentBilledUserCount,
    proration_behavior: "none",
    payment_behavior: "error_if_incomplete",
  });
}
