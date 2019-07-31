import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import first from '../../services/first';
import BidTaskType, {
  BidTaskTypeRow,
  dataAdapter,
  isBidTaskTypeRow
} from './domain-object';
import { validate } from '../../services/validate-from-db';

const TABLE_NAME = 'bid_task_types';

export async function create(
  bidTaskType: Unsaved<BidTaskType>,
  trx: Knex.Transaction
): Promise<BidTaskType> {
  const rowData = dataAdapter.forInsertion({
    ...bidTaskType,
    id: uuid.v4()
  });

  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .transacting(trx)
    .then((rows: BidTaskTypeRow[]) => first(rows));

  if (!created) {
    throw new Error(
      `Could not create BidTaskType for bid ${bidTaskType.pricingBidId}`
    );
  }

  return validate(TABLE_NAME, isBidTaskTypeRow, dataAdapter, created);
}
