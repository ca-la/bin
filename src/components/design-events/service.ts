import Knex from "knex";

import db from "../../services/db";
import { find } from "./dao";

export async function isQuoteCommitted(
  trx: Knex.Transaction | null,
  designId: string
): Promise<boolean> {
  const designEvents = await find(trx || db, {
    designId,
    type: "COMMIT_QUOTE",
  });
  return designEvents.length > 0;
}
