import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";
import { Plan } from "../plans/domain-object";

export interface Subscription {
  id: string;
  createdAt: Date;
  cancelledAt: Date | null;
  planId: string;
  paymentMethodId: string | null;
  stripeSubscriptionId: string | null;
  userId: string;
  isPaymentWaived: boolean;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan;
}

export interface SubscriptionRow {
  id: string;
  created_at: Date;
  cancelled_at: Date | null;
  plan_id: string;
  payment_method_id: string | null;
  stripe_subscription_id: string | null;
  user_id: string;
  is_payment_waived: boolean;
}

export const dataAdapter = new DataAdapter<SubscriptionRow, Subscription>();
export const partialDataAdapter = new DataAdapter<
  Partial<SubscriptionRow>,
  Partial<Subscription>
>();

export function isSubscriptionRow(row: object): row is SubscriptionRow {
  return hasProperties(
    row,
    "id",
    "created_at",
    "cancelled_at",
    "plan_id",
    "payment_method_id",
    "stripe_subscription_id",
    "user_id",
    "is_payment_waived"
  );
}

export function isSubscription(data: object): data is Subscription {
  return hasProperties(
    data,
    "id",
    "createdAt",
    "cancelledAt",
    "planId",
    "paymentMethodId",
    "stripeSubscriptionId",
    "userId",
    "isPaymentWaived"
  );
}
