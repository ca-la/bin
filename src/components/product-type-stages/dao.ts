import * as Knex from 'knex';
import * as rethrow from 'pg-rethrow';
import * as uuid from 'node-uuid';

import db = require('../../services/db');
import ProductTypeStage, {
  dataAdapter,
  isProductTypeStageRow,
  ProductTypeStageRow
} from './domain-object';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'product_type_stages';

export async function create(
  productTypeStage: ProductTypeStage | MaybeUnsaved<ProductTypeStage>,
  trx?: Knex.Transaction
): Promise<ProductTypeStage> {
  const row = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...productTypeStage
  });

  const created = await db(TABLE_NAME)
    .insert(row)
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .returning('*')
    .then((rows: ProductTypeStageRow[]) => {
      return first(rows);
    });

  if (!created) {
    throw new Error('Failed to create a ProductTypeStage!');
  }

  return validate<ProductTypeStageRow, ProductTypeStage>(
    TABLE_NAME,
    isProductTypeStageRow,
    dataAdapter,
    created
  );
}

export async function findAllByProductType(
  productTypeId: string
): Promise<ProductTypeStage[]> {
  const rows = await db(TABLE_NAME)
    .where({ pricing_product_type_id: productTypeId })
    .catch(rethrow);

  return validateEvery<ProductTypeStageRow, ProductTypeStage>(
    TABLE_NAME,
    isProductTypeStageRow,
    dataAdapter,
    rows
  );
}
