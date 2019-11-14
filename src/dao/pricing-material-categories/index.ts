import db from '../../services/db';
import { MaterialCategory } from '../../domain-objects/pricing';

export async function findLatest(): Promise<MaterialCategory[]> {
  const TABLE_NAME = 'pricing_product_materials';
  const types = await db(TABLE_NAME)
    .select(['category'])
    .whereIn('version', db(TABLE_NAME).max('version'))
    .groupBy(['category'])
    .orderBy('category');

  return types;
}
