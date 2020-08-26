import Knex from "knex";
import { CreateQuotePayload } from "../../services/generate-pricing-quote";

export default async function createDesignPaymentLocks(
  trx: Knex.Transaction,
  createPayloads: CreateQuotePayload[]
) {
  for (const payload of createPayloads) {
    await trx.raw(
      "select * from pricing_cost_inputs where design_id = ? for update",
      [payload.designId]
    );
  }
}
