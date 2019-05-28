import * as Knex from 'knex';
import * as db from '../../services/db';

import Design = require('../../domain-objects/product-design');
import { findAndDuplicateDesign } from './designs';

/**
 * Duplicates all the supplied designs for the given user.
 */
export async function duplicateDesigns(
  userId: string,
  initialDesignIds: string[]
): Promise<Design[]> {
  return db.transaction(async (trx: Knex.Transaction) => {
    return Promise.all(
      initialDesignIds.map((initialDesignId: string) => {
        return findAndDuplicateDesign(initialDesignId, userId, trx);
      })
    );
  });
}
