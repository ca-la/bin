import Knex from 'knex';

import db from '../../../services/db';
import CohortUser, {
  CohortUserRow,
  dataAdapter,
  isCohortUserRow
} from './domain-object';
import first from '../../../services/first';
import { validate, validateEvery } from '../../../services/validate-from-db';

const TABLE_NAME = 'cohort_users';

export async function create(
  data: CohortUser,
  trx?: Knex.Transaction
): Promise<CohortUser> {
  const rowData = dataAdapter.forInsertion(data);
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: object[]) => first(rows));

  if (!created) {
    throw new Error('Failed to create cohort user!');
  }

  return validate<CohortUserRow, CohortUser>(
    TABLE_NAME,
    isCohortUserRow,
    dataAdapter,
    created
  );
}

export async function findAllByCohort(
  cohortId: string,
  trx?: Knex.Transaction
): Promise<CohortUser[]> {
  const cohortUsers = await db(TABLE_NAME)
    .select('*')
    .where({ cohort_id: cohortId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<CohortUserRow, CohortUser>(
    TABLE_NAME,
    isCohortUserRow,
    dataAdapter,
    cohortUsers
  );
}

export async function findAllByUser(
  userId: string,
  trx?: Knex.Transaction
): Promise<CohortUser[]> {
  const cohortUsers = await db(TABLE_NAME)
    .select('*')
    .where({ user_id: userId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<CohortUserRow, CohortUser>(
    TABLE_NAME,
    isCohortUserRow,
    dataAdapter,
    cohortUsers
  );
}
