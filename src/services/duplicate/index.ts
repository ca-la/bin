import Knex from "knex";
import db from "../../services/db";

import Design = require("../../components/product-designs/domain-objects/product-design");
import { findAndDuplicateDesign } from "./designs";

/**
 * Duplicates all the supplied designs for the given user.
 */
export async function duplicateDesigns(
  userId: string,
  initialDesignIds: string[],
  trx?: Knex.Transaction
): Promise<Design[]> {
  if (trx) {
    const duplicatedDesigns: Design[] = [];
    for (const initialDesignId of initialDesignIds) {
      const newDesign = await findAndDuplicateDesign(
        trx,
        initialDesignId,
        userId
      );
      duplicatedDesigns.push(newDesign);
    }

    return duplicatedDesigns;
  }

  return db.transaction(async (localTrx: Knex.Transaction) => {
    const duplicatedDesigns: Design[] = [];
    for (const initialDesignId of initialDesignIds) {
      const newDesign = await findAndDuplicateDesign(
        localTrx,
        initialDesignId,
        userId
      );
      duplicatedDesigns.push(newDesign);
    }

    return duplicatedDesigns;
  });
}
