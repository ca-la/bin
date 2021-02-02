import InvalidPaymentError = require("../../errors/invalid-payment");
import makeRequest from "./make-request";

interface Options {
  stripePlanId: string;
  stripeCustomerId: string;
  stripeSourceId: string;
}

interface Response {
  id: string;
  status: "active" | "incomplete";
}

export default async function createSubscription(
  options: Options
): Promise<Response> {
  const { stripePlanId, stripeCustomerId, stripeSourceId } = options;

  const subscription = await makeRequest<Response>({
    method: "post",
    path: "/subscriptions",
    data: {
      items: [{ plan: stripePlanId }],
      customer: stripeCustomerId,
      default_source: stripeSourceId,
    },
  });

  if (subscription.status !== "active") {
    throw new InvalidPaymentError(
      "Failed to charge card for this subscription"
    );
  }

  return subscription;
}
