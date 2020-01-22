import Knex from 'knex';
import uuid from 'node-uuid';
import meow from 'meow';

import db from '../services/db';
import { log } from '../services/logger';

const HELP_TEXT = `
  Promote a specific version of a pricing table to be the latest version

  Usage
  $ promote-pricing-version [version number]

  Options
  --table, -t      REQUIRED One of: constants, labels, margins, processTimelines, processes, types, material
`;

const cli = meow(HELP_TEXT, {
  flags: {
    table: {
      alias: 't',
      type: 'string'
    }
  }
});

async function findMaxVersion(tableName: string): Promise<number> {
  const { max }: { max: number } = await db(tableName)
    .max('version')
    .first();

  return max;
}

function findAtVersion<T>(tableName: string, version: number): Promise<T[]> {
  return db(tableName)
    .select()
    .where({ version });
}

async function promoteVersion<T>(
  trx: Knex.Transaction,
  version: number,
  tableName: string
): Promise<T[]> {
  const atVersion = await findAtVersion<T>(tableName, version);
  const currentVersion = await findMaxVersion(tableName);
  const toInsert: T[] = atVersion.map((row: T) => ({
    ...row,
    id: uuid.v4(),
    created_at: new Date(),
    version: currentVersion + 1
  }));

  return trx(tableName)
    .insert(toInsert)
    .returning('*');
}

interface TableMap {
  constants: string;
  labels: string;
  margins: string;
  materials: string;
  processTimelines: string;
  processes: string;
  types: string;
}
const tableMap: TableMap = {
  constants: 'pricing_constants',
  labels: 'pricing_care_labels',
  margins: 'pricing_margins',
  materials: 'pricing_product_materials',
  processTimelines: 'pricing_process_timelines',
  processes: 'pricing_processes',
  types: 'pricing_product_types'
};

type TableKey = keyof TableMap;

function isTableKey(candidate: any): candidate is TableKey {
  return Object.keys(tableMap).includes(candidate);
}

async function main(): Promise<void> {
  if (!isTableKey(cli.flags.table)) {
    throw new Error(`You must pass in a valid table name.\n${HELP_TEXT}`);
  }

  const tableName = tableMap[cli.flags.table];
  const version = parseInt(cli.input[0], 10);

  if (Number.isNaN(version)) {
    throw new Error(`Version number not valid\n${HELP_TEXT}`);
  }

  return db.transaction(async (trx: Knex.Transaction) => {
    log(`Inserting to ${tableName}`);
    const promoted = await promoteVersion(trx, version, tableName);
    log(` - ${promoted.length} row(s) inserted`);
  });
}

main()
  .then(() => {
    process.exit();
  })
  .catch((err: Error) => {
    log(err.message);
    process.exit(1);
  });
