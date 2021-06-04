import Knex from "knex";

import db from "../services/db";
import { costCollection } from "./cost-collection";
import { createQuotes } from "../services/generate-pricing-quote";

export async function checkout(generatePricing: boolean = true) {
  const {
    team,
    collection,
    collectionDesigns,
    draftDesigns,
    user,
  } = await costCollection(generatePricing);
  const quotes = await db.transaction(async (trx: Knex.Transaction) =>
    createQuotes(
      [
        { designId: collectionDesigns[0].id, units: 300 },
        { designId: collectionDesigns[1].id, units: 200 },
      ],
      user.designer.user.id,
      trx
    )
  );

  return {
    team,
    collection,
    collectionDesigns,
    draftDesigns,
    quotes,
    user,
  };
}
