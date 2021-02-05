import {
  PlanStripePrice,
  PlanStripePriceType,
} from "../../components/plan-stripe-price/types";
import InvalidPaymentError = require("../../errors/invalid-payment");
import { StripeDataObject } from "./serialize-request-body";
import makeRequest from "./make-request";

interface Options {
  stripeCustomerId: string;
  stripeSourceId: string | null;
  stripePrices: PlanStripePrice[];
  seatCount: number | null;
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
  const { stripeCustomerId, stripeSourceId, stripePrices, seatCount } = options;
  const hasPerSeatPrice = stripePrices.some(
    (price: PlanStripePrice) => price.type === PlanStripePriceType.PER_SEAT
  );

  if (hasPerSeatPrice && seatCount === null) {
    throw new Error(
      "Must pass non-null seatCount when plan includes a PER_SEAT price type"
    );
  }

  const data: Request = {
    items: stripePrices.map((price: PlanStripePrice) => ({
      price: price.stripePriceId,
      ...(price.type === PlanStripePriceType.PER_SEAT
        ? { quantity: seatCount || 0 }
        : null),
    })),
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
