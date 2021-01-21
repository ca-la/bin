import Knex from "knex";

import { find } from "./dao";

export async function isQuoteCommitted(
  trx: Knex.Transaction,
  designId: string
): Promise<boolean> {
  const designEvents = await find(trx, {
    designId,
    type: "COMMIT_QUOTE",
  });
  return designEvents.length > 0;
}
