import * as z from "zod";
import querystring from "querystring";

import { STRIPE_SECRET_KEY } from "../../config";

import makeRequest, { RequestOptions } from "./make-request";
import serializeRequestBody, {
  StripeDataObject,
} from "./serialize-request-body";
import {
  balanceSchema,
  chargeSchema,
  connectAccountSchema,
  customerSchema,
  loginLinkSchema,
  Subscription,
  subscriptionItemSchema,
  subscriptionSchema,
  invoicesSchema,
  transferSchema,
  prorationBehaviourSchema,
} from "./types";

const STRIPE_CONNECT_API_BASE = "https://connect.stripe.com";

// https://stripe.com/docs/api/charges/object#charge_object-amount
const STRIPE_MAX_AMOUNT_SCHEMA = z.number().int().positive().max(99999999);

function safeRequest<RequestType extends StripeDataObject, ResponseType>({
  inputSchema,
  outputSchema,
  options,
  request,
}: {
  inputSchema: z.ZodSchema<RequestType>;
  outputSchema: z.ZodSchema<ResponseType>;
  options: RequestOptions;
  request?: StripeDataObject;
}): Promise<ResponseType> {
  const data = request && inputSchema.parse(request);

  return makeRequest({
    ...options,
    ...(options.method === "post"
      ? {
          data: {
            ...data,
            ...options.data,
          },
        }
      : {}),
  }).then(outputSchema.parse);
}

const createChargeRequestSchema = z.object({
  amount: STRIPE_MAX_AMOUNT_SCHEMA,
  currency: z.enum(["usd"]),
  source: z.string(),
  customer: z.string(),
  description: z.string().optional(),
  transfer_group: z.string(),
});

type CreateChargeRequest = z.infer<typeof createChargeRequestSchema>;

export function createCharge(
  idempotencyKey: string,
  request: CreateChargeRequest
) {
  return safeRequest({
    inputSchema: createChargeRequestSchema,
    outputSchema: chargeSchema,
    options: {
      method: "post",
      path: "/charges",
      idempotencyKey,
    },
    request,
  });
}

const createTransferRequestSchema = z.object({
  amount: STRIPE_MAX_AMOUNT_SCHEMA,
  currency: z.enum(["usd"]),
  destination: z.string(),
  description: z.string(),
  transfer_group: z.string().nullable(),
  source_type: z.string().optional(),
});

type CreateTransferRequest = z.infer<typeof createTransferRequestSchema>;

export function createTransfer(
  idempotencyKey: string,
  request: CreateTransferRequest
) {
  return safeRequest({
    inputSchema: createTransferRequestSchema,
    outputSchema: transferSchema,
    options: {
      method: "post",
      path: "/transfers",
      idempotencyKey,
    },
    request,
  });
}

const findCustomerRequestSchema = z.object({
  email: z.string(),
  limit: z.number().int().positive().optional(),
});

type FindCustomerRequest = z.infer<typeof findCustomerRequestSchema>;

const customerListSchema = z
  .object({
    object: z.literal("list"),
    data: z.array(customerSchema),
  })
  .passthrough();

export function findCustomersByEmail(request: FindCustomerRequest) {
  const query = querystring.stringify(request);

  return safeRequest({
    inputSchema: z.never(),
    outputSchema: customerListSchema,
    options: {
      method: "get",
      path: `/customers?${query}`,
    },
  });
}

const createCustomerRequestSchema = z.object({
  description: z.string(),
  email: z.string(),
});

type CreateCustomerRequest = z.infer<typeof createCustomerRequestSchema>;

export function createCustomer(request: CreateCustomerRequest) {
  return safeRequest({
    inputSchema: createCustomerRequestSchema,
    outputSchema: customerSchema,
    options: {
      method: "post",
      path: "/customers",
    },
    request,
  });
}

const createConnectAccountRequestSchema = z.object({
  code: z.string(),
});

type CreateConnectAccountRequest = z.infer<
  typeof createConnectAccountRequestSchema
>;

export function createConnectAccount(request: CreateConnectAccountRequest) {
  return safeRequest({
    inputSchema: createConnectAccountRequestSchema,
    outputSchema: connectAccountSchema,
    options: {
      apiBase: STRIPE_CONNECT_API_BASE,
      method: "post",
      path: "/oauth/token",
      data: {
        client_secret: STRIPE_SECRET_KEY,
        grant_type: "authorization_code",
      },
    },
    request,
  });
}

export function createLoginLink({ accountId }: { accountId: string }) {
  return safeRequest({
    inputSchema: z.never(),
    outputSchema: loginLinkSchema,
    options: {
      method: "post",
      path: `/accounts/${accountId}/login_links`,
    },
  });
}

export function getBalances() {
  return safeRequest({
    inputSchema: z.never(),
    outputSchema: balanceSchema,
    options: {
      method: "get",
      path: "/balance",
    },
  });
}

export function getSubscription(subscriptionId: string) {
  return safeRequest({
    inputSchema: z.never(),
    outputSchema: subscriptionSchema,
    options: {
      method: "get",
      path: `/subscriptions/${subscriptionId}`,
    },
  });
}

export function getInvoicesAfterSpecified(
  invoiceId: string,
  { limit = 100 }: { limit?: number } = {}
) {
  return safeRequest({
    inputSchema: z.never(),
    outputSchema: invoicesSchema,
    options: {
      method: "get",
      path: `/invoices?ending_before=${invoiceId}&limit=${limit}`,
    },
  });
}

const subscriptionItemUpdateSchema = subscriptionItemSchema.partial().extend({
  price: z.string().optional(),
  deleted: z.boolean().optional(),
  proration_behavior: prorationBehaviourSchema.optional(),
  payment_behavior: z
    .enum(["allow_incomplete", "pending_if_incomplete", "error_if_incomplete"])
    .optional(),
});

export type SubscriptionItemUpdate = z.infer<
  typeof subscriptionItemUpdateSchema
>;

export function updateStripeSubscriptionItem(
  id: string,
  request: SubscriptionItemUpdate
) {
  return safeRequest({
    inputSchema: subscriptionItemUpdateSchema,
    outputSchema: subscriptionItemSchema,
    options: {
      method: "post",
      path: `/subscription_items/${id}`,
    },
    request,
  });
}

const subscriptionUpdateSchema = subscriptionSchema.partial().extend({
  items: z.array(subscriptionItemUpdateSchema),
  proration_behavior: prorationBehaviourSchema.optional(),
  payment_behavior: z
    .enum(["allow_incomplete", "pending_if_incomplete", "error_if_incomplete"])
    .optional(),
  default_source: z.string().optional(),
});

export type SubscriptionUpdate = z.infer<typeof subscriptionUpdateSchema>;

export async function updateSubscription(
  subscriptionId: string,
  request: SubscriptionUpdate
): Promise<Subscription> {
  return safeRequest({
    inputSchema: subscriptionUpdateSchema,
    outputSchema: subscriptionSchema,
    options: {
      method: "post",
      path: `/subscriptions/${subscriptionId}`,
    },
    request,
  });
}

const retrieveStripeInvoiceSchema = z.object({
  subscription: z.string(),
  subscription_items: z.array(subscriptionItemUpdateSchema),
  subscription_proration_behavior: prorationBehaviourSchema.optional(),
});

type RetrieveStripeInvoice = z.infer<typeof retrieveStripeInvoiceSchema>;

const stripeInvoiceSchema = z
  .object({
    subtotal: z.number(),
    total: z.number(),
    status: z.string(),
  })
  .passthrough();

type StripeInvoice = z.infer<typeof stripeInvoiceSchema>;

export async function retrieveUpcomingInvoice(
  request: RetrieveStripeInvoice
): Promise<StripeInvoice> {
  const data = retrieveStripeInvoiceSchema.parse(request);
  const queryParams = serializeRequestBody(data);

  return safeRequest({
    inputSchema: z.never(),
    outputSchema: stripeInvoiceSchema,
    options: {
      method: "get",
      path: `/invoices/upcoming?${queryParams}`,
    },
  });
}
