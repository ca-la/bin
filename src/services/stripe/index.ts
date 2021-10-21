import Knex from "knex";
import uuid from "node-uuid";

import { insecureHash } from "../insecure-hash";
import * as UsersDAO from "../../components/users/dao";
import TeamUsersDAO from "../../components/team-users/dao";
import { standardDao as TeamsDAO } from "../../components/teams/dao";
import CustomersDAO from "../../components/customers/dao";
import * as SubscriptionsDAO from "../../components/subscriptions/dao";
import {
  PlanStripePrice,
  PlanStripePriceType,
} from "../../components/plan-stripe-price/types";
import InsufficientPlanError from "../../errors/insufficient-plan";

import {
  Charge,
  ConnectAccount,
  Customer as StripeCustomer,
  SourceTypes,
  SubscriptionItem,
  Transfer,
} from "./types";
import * as StripeAPI from "./api";
import { TeamUserRole } from "../../components/team-users";
import { Customer } from "../../components/customers/types";

export * from "./types";
export * from "./service";

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
  const {
    description,
    bidId,
    destination,
    amountCents,
    invoiceId,
    sourceType,
  } = options;
  if (!invoiceId && !bidId) {
    throw new Error(`A Bid or Invoice ID is required`);
  }
  const idempotencyKey = insecureHash(
    `${description}-${
      bidId || invoiceId
    }-${destination}-${sourceType}-${amountCents}`
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

export async function findCustomer(
  email: string
): Promise<StripeCustomer | null> {
  const found = await StripeAPI.findCustomersByEmail({ email, limit: 1 });

  if (found.data.length === 0) {
    return null;
  }

  return found.data[0];
}

async function findOrCreateTeamCustomer(trx: Knex.Transaction, teamId: string) {
  const team = await TeamsDAO.findById(trx, teamId);
  if (!team) {
    throw new Error(`Could not find team ${teamId}`);
  }

  const owner = await TeamUsersDAO.findOne(trx, {
    teamId,
    role: TeamUserRole.OWNER,
  });

  if (!owner || !owner.user || !owner.user.email) {
    throw new Error(`Could not find a valid owner for team ${teamId}`);
  }

  const stripeCustomer = await StripeAPI.createCustomer({
    description: `TEAM: ${team.title}`,
    email: owner.user.email,
  });

  return CustomersDAO.create(trx, {
    id: uuid.v4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    provider: "STRIPE",
    customerId: stripeCustomer.id,
    teamId,
    userId: null,
  });
}

async function findOrCreateUserCustomer(trx: Knex.Transaction, userId: string) {
  const user = await UsersDAO.findById(userId, trx);

  if (!user) {
    throw new Error(`Invalid user ID: ${userId}`);
  }
  if (!user.email) {
    throw new Error(
      `Email is required to create stripe customer for User ${user.id}`
    );
  }

  const stripeCustomer = await StripeAPI.createCustomer({
    description: `USER: ${user.name || ""}`,
    email: user.email,
  });

  return CustomersDAO.create(trx, {
    id: uuid.v4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    provider: "STRIPE",
    customerId: stripeCustomer.id,
    userId,
    teamId: null,
  });
}

export async function findOrCreateCustomer(
  trx: Knex.Transaction,
  options: { teamId: null; userId: string } | { teamId: string; userId: null }
): Promise<Customer> {
  const { teamId, userId } = options;

  const customer = await CustomersDAO.findOne(trx, options);
  if (customer) {
    return customer;
  }

  if (teamId) {
    return findOrCreateTeamCustomer(trx, teamId);
  }

  if (userId) {
    return findOrCreateUserCustomer(trx, userId);
  }

  throw new Error("Must provide a userId or teamId");
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
    throw new InsufficientPlanError(
      `Could not find a subscription for team with ID ${teamId}`
    );
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
