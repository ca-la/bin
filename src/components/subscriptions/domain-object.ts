import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";
import { Plan } from "../plans/domain-object";

interface SubscriptionBase {
  id: string;
  createdAt: Date;
  cancelledAt: Date | null;
  planId: string;
  paymentMethodId: string | null;
  stripeSubscriptionId: string | null;
  isPaymentWaived: boolean;
}

interface UserSubscription extends SubscriptionBase {
  userId: string;
  teamId: null;
}

interface TeamSubscription extends SubscriptionBase {
  userId: null;
  teamId: string;
}

export type Subscription = UserSubscription | TeamSubscription;

export type SubscriptionWithPlan = Subscription & {
  plan: Plan;
};

export interface SubscriptionRow {
  id: string;
  created_at: Date;
  cancelled_at: Date | null;
  plan_id: string;
  payment_method_id: string | null;
  stripe_subscription_id: string | null;
  user_id: string | null;
  team_id: string | null;
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
    "team_id",
    "is_payment_waived"
  );
}

export function isSubscription(data: any): data is Subscription {
  if (typeof data !== "object") {
    return false;
  }
  if (
    !hasProperties(
      data,
      "id",
      "createdAt",
      "cancelledAt",
      "planId",
      "paymentMethodId",
      "stripeSubscriptionId",
      "userId",
      "teamId",
      "isPaymentWaived"
    )
  ) {
    return false;
  }
  if (data.teamId && !data.userId) {
    return true;
  }
  if (!data.teamId && data.userId) {
    return true;
  }

  return false;
}
