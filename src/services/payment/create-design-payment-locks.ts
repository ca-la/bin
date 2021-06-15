import Knex from "knex";
import { CreateQuotePayload } from "../../services/generate-pricing-quote";

export default async function createDesignPaymentLocks(
  trx: Knex.Transaction,
  createPayloads: CreateQuotePayload[]
) {
  const designIdsToLock = createPayloads.map(
    ({ designId }: CreateQuotePayload) => designId
  );
  await trx.raw(
    "select * from pricing_cost_inputs where design_id = ANY(?) for update",
    [designIdsToLock]
  );
}
