import * as db from '../../services/db';
import { Complexity } from '../../domain-objects/pricing';

export async function findLatest(): Promise<Complexity[]> {
  const TABLE_NAME = 'pricing_product_types';
  const types = await db(TABLE_NAME)
    .select(['complexity'])
    .whereIn('version', db(TABLE_NAME).max('version'))
    .groupBy(['complexity'])
    .orderBy('complexity');

  return types;
}
