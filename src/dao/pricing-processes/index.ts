import * as db from '../../services/db';
import { isProcess, Process } from '../../domain-objects/pricing';
import DataAdapter from '../../services/data-adapter';
import { validateEvery } from '../../services/validate-from-db';

const dataAdapter = new DataAdapter<Process, Process>();

export async function findLatest(): Promise<Process[]> {
  const TABLE_NAME = 'pricing_processes';

  const processes = await db(TABLE_NAME)
    .select(['name', 'complexity'])
    .whereIn('version', db(TABLE_NAME).max('version'))
    .groupBy(['name', 'complexity'])
    .orderBy('name')
    .orderBy('complexity');

  return validateEvery('pricing_processes', isProcess, dataAdapter, processes);
}
