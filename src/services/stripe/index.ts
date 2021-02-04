import Knex from "knex";
import * as z from "zod";
import { insecureHash } from "../insecure-hash";
import Logger from "../logger";
import makeRequest from "./make-request";
import PaymentMethodsDAO from "../../components/payment-methods/dao";
import * as UsersDAO from "../../components/users/dao";
import TeamUsersDAO from "../../components/team-users/dao";
import { STRIPE_SECRET_KEY } from "../../config";
import * as SubscriptionsDAO from "../../components/subscriptions/dao";
import {
  PlanStripePrice,
  PlanStripePriceType,
} from "../../components/plan-stripe-price/types";

const STRIPE_CONNECT_API_BASE = "https://connect.stripe.com";

interface StripeChargeOptions {
  customerId: string;
  sourceId: string;
  amountCents: number;
  description: string;
  invoiceId: string;
}

export async function charge(options: StripeChargeOptions): Promise<object> {
  const { customerId, sourceId, amountCents, description, invoiceId } = options;

  // Using a combination of invoiceId + sourceId ensures that:
  // - We can't charge the same card for the same invoice twice in rapid succesion
  // - Switching sources lets you try again
  //
  // TBD if we need a better solution here but this seems ~fine for now.
  const idempotencyKey = insecureHash(
    `${invoiceId}/${sourceId}/${amountCents}`
  );

  return makeRequest({
    method: "post",
    path: "/charges",
    data: {
      amount: amountCents,
      currency: "usd",
      source: sourceId,
      description,
      customer: customerId,
      transfer_group: invoiceId,
    },
    idempotencyKey,
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
): Promise<object> {
  const { description, bidId, destination, amountCents, invoiceId } = options;
  if (!invoiceId && !bidId) {
    throw new Error(`A Bid or Invoice ID is required`);
  }
  const idempotencyKey = insecureHash(
    `${description}-${bidId || invoiceId}-${destination}`
  );

  return makeRequest({
    method: "post",
    path: "/transfers",
    data: {
      amount: amountCents,
      currency: "usd",
      destination,
      description,
      transfer_group: bidId || invoiceId,
      source_type: options.sourceType,
    },
    idempotencyKey,
  });
}

async function findCustomer(email: string): Promise<{ id: string } | null> {
  const found = await makeRequest<{ id: string }[]>({
    method: "get",
    path: "/customers",
    data: {
      email,
      limit: 1,
    },
  });

  if (found.length === 0) {
    return null;
  }

  return found[0];
}

async function createCustomer({
  email,
  name,
}: {
  email: string;
  name: string;
}): Promise<{ id: string }> {
  return makeRequest<{ id: string }>({
    method: "post",
    path: "/customers",
    data: {
      email,
      description: name,
    },
  });
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

  const customer = await createCustomer({
    name: user.name || "",
    email: user.email,
  });
  return customer.id;
}

// https://stripe.com/docs/connect/express-accounts#token-request
export async function createConnectAccount(
  authorizationCode: string
): Promise<object> {
  return makeRequest({
    apiBase: STRIPE_CONNECT_API_BASE,
    method: "post",
    path: "/oauth/token",
    data: {
      client_secret: STRIPE_SECRET_KEY,
      grant_type: "authorization_code",
      code: authorizationCode,
    },
  });
}

export async function createLoginLink(accountId: string): Promise<string> {
  try {
    const response = await makeRequest<{ url: string }>({
      method: "post",
      path: `/accounts/${accountId}/login_links`,
    });

    if (!response || !response.url) {
      Logger.log(response);
      throw new Error("Could not parse Stripe login URL from response");
    }

    return response.url;
  } catch (err) {
    if (err.message.indexOf("not an Express account") > -1) {
      return "https://dashboard.stripe.com/";
    }

    throw err;
  }
}

// Stripe accounts can contain balances in one or more arbitrarily-named
// "accounts"
// Keys are account name, values are an integer number of cents.
interface Balances {
  [account: string]: number;
}

interface BalanceResponse {
  object: "balance";
  available: [
    {
      amount: number;
      currency: string;
      source_types: Balances;
    }
  ];
}

export async function getBalances(): Promise<Balances> {
  const response = await makeRequest<BalanceResponse>({
    method: "get",
    path: `/balance`,
  });

  if (!response.available || !response.available[0]) {
    Logger.logServerError("Stripe response: ", response);
    throw new Error("Malformed Balance response");
  }

  return response.available[0].source_types;
}

const subscriptionItemSchema = z
  .object({
    id: z.string(),
    quantity: z.number(),
    price: z
      .object({
        id: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

type SubscriptionItem = z.infer<typeof subscriptionItemSchema>;

const subscriptionItemUpdateSchema = subscriptionItemSchema.partial().extend({
  proration_behavior: z
    .enum(["create_prorations", "none", "always_invoice"])
    .optional(),
  payment_behavior: z
    .enum(["allow_incomplete", "pending_if_incomplete", "error_if_incomplete"])
    .optional(),
});

type SubscriptionItemUpdate = z.infer<typeof subscriptionItemUpdateSchema>;

const subscriptionSchema = z
  .object({
    id: z.string(),
    items: z.array(subscriptionItemSchema),
  })
  .passthrough();

function getSubscription(subscriptionId: string) {
  return makeRequest({
    method: "get",
    path: `/subscriptions/${subscriptionId}`,
  }).then(subscriptionSchema.parse);
}

function updateStripeSubscriptionItem(
  id: string,
  data: SubscriptionItemUpdate
) {
  return makeRequest({
    method: "post",
    path: `/subscription_items/${id}`,
    data,
  }).then(subscriptionItemSchema.parse);
}

export async function addSeatCharge(trx: Knex.Transaction, teamId: string) {
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
    return;
  }

  const stripeSubscription = await getSubscription(
    subscription.stripeSubscriptionId
  );
  const perSeatSubscriptionItem = stripeSubscription.items.find(
    (subscriptionItem: SubscriptionItem) =>
      subscriptionItem.price.id === perSeatPrice.stripePriceId
  );

  if (!perSeatSubscriptionItem) {
    throw new Error(
      `Could not find a PER_SEAT subscription item with price ID ${perSeatPrice.stripePriceId}`
    );
  }

  const currentNonViewerCount = await TeamUsersDAO.countNonViewers(trx, teamId);

  if (currentNonViewerCount !== perSeatSubscriptionItem.quantity + 1) {
    throw new Error(
      "Stripe quantity does not match current non-viewer seat count."
    );
  }

  await updateStripeSubscriptionItem(perSeatSubscriptionItem.id, {
    quantity: currentNonViewerCount,
    proration_behavior: "always_invoice",
    payment_behavior: "error_if_incomplete",
  });
}
