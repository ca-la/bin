import Knex from "knex";

import { find } from "./dao";

export async function isQuoteCommitted(
  ktx: Knex,
  designId: string
): Promise<boolean> {
  const designEvents = await find(ktx, {
    designId,
    type: "COMMIT_QUOTE",
  });
  return designEvents.length > 0;
}
