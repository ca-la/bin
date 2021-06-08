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
    return Promise.all(
      initialDesignIds.map((initialDesignId: string) => {
        return findAndDuplicateDesign(trx, initialDesignId, userId);
      })
    );
  }
  return db.transaction(async (localTrx: Knex.Transaction) => {
    return Promise.all(
      initialDesignIds.map((initialDesignId: string) => {
        return findAndDuplicateDesign(localTrx, initialDesignId, userId);
      })
    );
  });
}
