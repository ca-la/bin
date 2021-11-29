import { z } from "zod";
import { planSchema } from "../plans/types";

export const subscriptionUncheckedSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  cancelledAt: z.date().nullable(),
  planId: z.string(),
  paymentMethodId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  isPaymentWaived: z.boolean(),
  userId: z.string().nullable(),
  teamId: z.string().nullable(),
});
export type SubscriptionUnchecked = z.infer<typeof subscriptionUncheckedSchema>;

function checkSubscription(item: SubscriptionUnchecked) {
  return (item.userId && !item.teamId) || (item.teamId && !item.userId);
}
const subscriptionCheckError = {
  message: "Only one of 'userId' and 'teamId' should be set",
};

export const subscriptionSchema = subscriptionUncheckedSchema.refine(
  checkSubscription,
  subscriptionCheckError
);

export type Subscription = z.infer<typeof subscriptionSchema>;

export const subscriptionRowSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  cancelled_at: z.date().nullable(),
  plan_id: z.string(),
  payment_method_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  is_payment_waived: z.boolean(),
  user_id: z.string().nullable(),
  team_id: z.string().nullable(),
});
export type SubscriptionRow = z.infer<typeof subscriptionRowSchema>;

export const subscriptionWithPlanUncheckedSchema = subscriptionUncheckedSchema.extend(
  {
    plan: planSchema,
  }
);
export const subscriptionWithPlanSchema = subscriptionWithPlanUncheckedSchema.refine(
  checkSubscription,
  subscriptionCheckError
);
export type SubscriptionWithPlan = z.infer<typeof subscriptionWithPlanSchema>;
