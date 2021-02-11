import makeRequest from "./make-request";
import * as z from "zod";
import { check } from "../check";

const responseSchema = z.object({
  canceled_at: z.number().int().positive(),
});

type Response = z.infer<typeof responseSchema>;

export async function cancelSubscription(
  stripeSubscriptionId: string
): Promise<Date> {
  const response = await makeRequest<Response>({
    method: "delete",
    path: `/subscriptions/${stripeSubscriptionId}`,
    idempotencyKey: stripeSubscriptionId,
  });

  if (!check(responseSchema, response)) {
    throw new Error("Unexpected stripe response format");
  }

  return new Date(response.canceled_at * 1000);
}
