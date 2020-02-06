import Knex from 'knex';
import * as uuid from 'node-uuid';

import {
  dataAdapter,
  isNonBidDesignCostRow,
  NonBidDesignCost,
  NonBidDesignCostRow
} from './domain-object';
import { validate, validateEvery } from '../../services/validate-from-db';
import first from '../../services/first';

const TABLE_NAME = 'non_bid_design_costs';

export async function create(
  trx: Knex.Transaction,
  data: Unsaved<NonBidDesignCost>
): Promise<NonBidDesignCost> {
  const toInsert = dataAdapter.forInsertion({
    ...data,
    deletedAt: null,
    id: uuid.v4()
  });
  const created: NonBidDesignCostRow = await trx(TABLE_NAME)
    .insert(toInsert)
    .returning('*')
    .then(first);

  return validate(TABLE_NAME, isNonBidDesignCostRow, dataAdapter, created);
}

export async function findByDesign(
  trx: Knex.Transaction,
  designId: string
): Promise<NonBidDesignCost[]> {
  const byDesign: NonBidDesignCostRow[] = await trx
    .from(TABLE_NAME)
    .select()
    .where({ design_id: designId, deleted_at: null })
    .orderBy('created_at');

  return validateEvery(
    TABLE_NAME,
    isNonBidDesignCostRow,
    dataAdapter,
    byDesign
  );
}
