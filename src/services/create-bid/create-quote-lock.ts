import Knex from "knex";

export default function createQuoteLock(
  trx: Knex.Transaction,
  quoteId: string
) {
  return trx.raw("select * from pricing_quotes where id = ? for update", [
    quoteId,
  ]);
}
