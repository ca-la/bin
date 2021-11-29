import DataAdapter from "../../services/data-adapter";
import {
  Subscription,
  SubscriptionRow,
  subscriptionRowSchema,
  subscriptionSchema,
} from "./types";

export const dataAdapter = new DataAdapter<SubscriptionRow, Subscription>();
export const partialDataAdapter = new DataAdapter<
  Partial<SubscriptionRow>,
  Partial<Subscription>
>();

export function isSubscriptionRow(row: object): row is SubscriptionRow {
  return subscriptionRowSchema.safeParse(row).success;
}

export function isSubscription(data: any): data is Subscription {
  return subscriptionSchema.safeParse(data).success;
}
