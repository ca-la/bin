import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import * as db from '../../services/db';
import { ProductType } from '../../domain-objects/pricing';
import PricingProductType, {
  dataAdapter,
  isPricingProductTypeRow,
  PricingProductTypeRow
} from './domain-object';
import first from '../../services/first';
import { validate } from '../../services/validate-from-db';

const TABLE_NAME = 'pricing_product_types';

export async function create(
  type: MaybeUnsaved<PricingProductType>,
  trx?: Knex.Transaction
): Promise<PricingProductType> {
  const row = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...type
  });

  const created = await db(TABLE_NAME)
    .insert(row)
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .returning('*')
    .then((rows: PricingProductTypeRow[]) => {
      return first(rows);
    });

  if (!created) {
    throw new Error('Failed to create a PricingProductType!');
  }

  return validate<PricingProductTypeRow, PricingProductType>(
    TABLE_NAME,
    isPricingProductTypeRow,
    dataAdapter,
    created
  );
}

export async function findLatest(): Promise<ProductType[]> {
  const types = await db(TABLE_NAME)
    .select(['name'])
    .whereIn('version', db(TABLE_NAME).max('version'))
    .groupBy(['name'])
    .orderBy('name');

  return types;
}
