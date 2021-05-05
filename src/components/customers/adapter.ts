import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { Customer, CustomerRow } from "./types";

function encode(row: CustomerRow): Customer {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    customerId: row.customer_id,
    provider: row.provider,
    ...(row.team_id !== null
      ? {
          userId: null,
          teamId: row.team_id,
        }
      : {
          userId: row.user_id,
          teamId: null,
        }),
  };
}

function decode(data: Customer): CustomerRow {
  return {
    id: data.id,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
    deleted_at: data.deletedAt,
    customer_id: data.customerId,
    provider: data.provider,
    ...(data.teamId !== null
      ? {
          user_id: null,
          team_id: data.teamId,
        }
      : {
          user_id: data.userId,
          team_id: null,
        }),
  };
}

export default buildAdapter({
  domain: "Customer",
  encodeTransformer: encode,
  decodeTransformer: decode,
  requiredProperties: [],
});
