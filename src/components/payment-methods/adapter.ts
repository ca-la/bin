import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { PaymentMethod, PaymentMethodRow } from "./types";

function encode(row: PaymentMethodRow): PaymentMethod {
  return {
    id: row.id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    userId: row.user_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSourceId: row.stripe_source_id,
    lastFourDigits: row.last_four_digits,
    customerId: row.customer_id,
  };
}

function decode(data: PaymentMethod): PaymentMethodRow {
  return {
    id: data.id,
    created_at: data.createdAt,
    deleted_at: data.deletedAt,
    user_id: data.userId,
    stripe_customer_id: data.stripeCustomerId,
    stripe_source_id: data.stripeSourceId,
    last_four_digits: data.lastFourDigits,
    customer_id: data.customerId,
  };
}

export default buildAdapter({
  domain: "PaymentMethod",
  requiredProperties: [
    "id",
    "createdAt",
    "deletedAt",
    "userId",
    "stripeCustomerId",
    "stripeSourceId",
    "lastFourDigits",
  ],
  encodeTransformer: encode,
  decodeTransformer: decode,
});
