import * as db from '../../services/db';
import { ProductType } from '../../domain-objects/pricing';

export async function findLatest(): Promise<ProductType[]> {
  const TABLE_NAME = 'pricing_product_types';
  const types = await db(TABLE_NAME)
    .select(['name'])
    .whereIn('version', db(TABLE_NAME).max('version'))
    .groupBy(['name'])
    .orderBy('name');

  return types;
}
