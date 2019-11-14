import Knex from 'knex';
import { first } from 'lodash';

import db from '../../services/db';
import MonthlySalesReport, {
  dataAdapter,
  isMonthlySalesReportRow,
  MonthlySalesReportRow
} from './domain-object';
import { validate } from '../../services/validate-from-db';

const TABLE_NAME = 'monthly_sales_reports';

export async function create(
  data: Uninserted<MonthlySalesReport>,
  trx: Knex.Transaction
): Promise<MonthlySalesReport> {
  const rowData = dataAdapter.forInsertion(data);

  const result = await trx(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: MonthlySalesReportRow[]) => first(rows));

  return validate<MonthlySalesReportRow, MonthlySalesReport>(
    TABLE_NAME,
    isMonthlySalesReportRow,
    dataAdapter,
    result
  );
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<MonthlySalesReport> {
  const row = await db(TABLE_NAME)
    .where({ id })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: MonthlySalesReportRow[]) =>
      first<MonthlySalesReportRow>(rows)
    );

  if (!row) {
    throw new Error(`Unable to find monthly sales report "${id}"`);
  }

  return validate<MonthlySalesReportRow, MonthlySalesReport>(
    TABLE_NAME,
    isMonthlySalesReportRow,
    dataAdapter,
    row
  );
}
