import * as uuid from 'node-uuid';
import * as Knex from 'knex';

import * as db from '../../services/db';
import Cohort, {
  CohortRow,
  dataAdapter as cohortDataAdapter,
  isCohortRow
} from './domain-object';
import first from '../../services/first';
import { validate } from '../../services/validate-from-db';

const TABLE_NAME = 'cohorts';

export async function create(
  data: MaybeUnsaved<Cohort>,
  trx?: Knex.Transaction
): Promise<Cohort> {
  const rowData = cohortDataAdapter.forInsertion({
    id: uuid.v4(),
    ...data
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: object[]) => first(rows));

  if (!created) {
    throw new Error('Failed to create cohort!');
  }

  return validate<CohortRow, Cohort>(
    TABLE_NAME,
    isCohortRow,
    cohortDataAdapter,
    created
  );
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<Cohort | null> {
  const cohorts = await db(TABLE_NAME)
    .select('*')
    .where({ id })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: object[]) => first(rows));

  return validate<CohortRow, Cohort>(
    TABLE_NAME,
    isCohortRow,
    cohortDataAdapter,
    cohorts
  );
}
