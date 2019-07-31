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

export async function findByDesignId(
  designId: string
): Promise<PricingProductType | null> {
  const result = await db(TABLE_NAME)
    .select('pricing_product_types.*')
    .innerJoin(
      'pricing_inputs',
      'pricing_inputs.product_type_id',
      'pricing_product_types.id'
    )
    .innerJoin(
      'pricing_quotes',
      'pricing_quotes.pricing_quote_input_id',
      'pricing_inputs.id'
    )
    .where({ 'pricing_quotes.design_id': designId })
    .orderBy('pricing_quotes.created_at', 'DESC')
    .then((rows: PricingProductTypeRow[]) => {
      return first(rows);
    });

  if (!result) {
    return null;
  }

  return validate<PricingProductTypeRow, PricingProductType>(
    TABLE_NAME,
    isPricingProductTypeRow,
    dataAdapter,
    result
  );
}
