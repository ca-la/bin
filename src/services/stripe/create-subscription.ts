import InvalidPaymentError = require("../../errors/invalid-payment");
import { StripeDataObject } from "./serialize-request-body";
import makeRequest from "./make-request";

interface Options {
  stripePlanId: string;
  stripeCustomerId: string;
  stripeSourceId: string | null;
}

interface Request extends StripeDataObject {
  items: ({ plan: string } | { price: string })[];
  customer: string;
  default_source?: string;
}

interface Response {
  id: string;
  status: "active" | "incomplete";
}

export default async function createSubscription(
  options: Options
): Promise<Response> {
  const { stripePlanId, stripeCustomerId, stripeSourceId } = options;

  const data: Request = {
    items: [{ plan: stripePlanId }],
    customer: stripeCustomerId,
  };

  if (stripeSourceId) {
    data.default_source = stripeSourceId;
  }

  const subscription = await makeRequest<Response>({
    method: "post",
    path: "/subscriptions",
    data,
  });

  if (subscription.status !== "active") {
    throw new InvalidPaymentError(
      "Failed to charge card for this subscription"
    );
  }

  return subscription;
}
