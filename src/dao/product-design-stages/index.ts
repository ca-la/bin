import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import ProductDesignStage, {
  dataAdapter,
  isDesignStageRow,
  ProductDesignStageRow
} from '../../domain-objects/product-design-stage';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'product_design_stages';

export async function create(
  data: Unsaved<ProductDesignStage>,
  trx?: Knex.Transaction
): Promise<ProductDesignStage> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4()
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: ProductDesignStageRow[]) => first<ProductDesignStageRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  return validate<ProductDesignStageRow, ProductDesignStage>(
    TABLE_NAME,
    isDesignStageRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<ProductDesignStage | null> {
  const stages: ProductDesignStageRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id })
    .orderBy('created_at', 'asc')
    .limit(1);

  const stage = stages[0];
  if (!stage) { return null; }

  return validate<ProductDesignStageRow, ProductDesignStage>(
    TABLE_NAME,
    isDesignStageRow,
    dataAdapter,
    stage
  );
}

export async function findAllByDesignId(
  designId: string
): Promise<ProductDesignStage[]> {
  const stages: ProductDesignStageRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ design_id: designId })
    .orderBy('ordering', 'asc');

  return validateEvery<ProductDesignStageRow, ProductDesignStage>(
    TABLE_NAME,
    isDesignStageRow,
    dataAdapter,
    stages
  );
}

export async function findAllTitles(): Promise<string[]> {
  return db(TABLE_NAME).distinct('title').distinct('ordering').orderBy('ordering')
    .then((rows: {title: string}[]) =>
      rows.map((row: {title: string}) =>
        row.title));
}
