import * as readline from 'readline';
import * as process from 'process';
import * as fs from 'fs';
import * as uuid from 'node-uuid';
import * as meow from 'meow';
import * as parse from 'csv-parse/lib/sync';
import * as Knex from 'knex';

import * as db from '../services/db';
import { log } from '../services/logger';
import { hasOnlyProperties } from '../services/require-properties';
import { PricingConstantRow } from '../domain-objects/pricing-constant';
import { PricingProductTypeRow } from '../domain-objects/pricing-product-type';
import { PricingCareLabelRow } from '../domain-objects/pricing-care-label';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

type Stringly<T extends { id: any, created_at: any, version: any }> = {
  [P in keyof Omit<T, 'id' | 'created_at' | 'version'>]: string
};

type RawConstants = Stringly<PricingConstantRow>;
type RawType = Stringly<PricingProductTypeRow>;
type RawLabel = Stringly<PricingCareLabelRow>;
type DomainObject = PricingConstantRow | PricingProductTypeRow | PricingCareLabelRow;

const HELP_TEXT = `
  Insert pricing values into pricing tables

  Usage
    $ insert-pricing [input csv file]

  Options
  --table, -t      REQUIRED One of: types, constants, processes, or labels
  --quiet, -q      Suppress output
  --force, -f      Do not ask for user confirmation
  --dry-run        Only print the query, do not execute
`;

const cli = meow(HELP_TEXT, {
  flags: {
    dryRun: {
      default: false,
      type: 'boolean'
    },
    force: {
      alias: 'f',
      default: false,
      type: 'boolean'
    },
    table: {
      alias: 't',
      type: 'string'
    },
    verbose: {
      alias: 'v',
      default: true,
      type: 'boolean'
    }
  }
});

interface TableMap {
  constants: string;
  labels: string;
  processes: string;
  types: string;
}
const tableMap: TableMap = {
  constants: 'pricing_constants',
  labels: 'pricing_care_labels',
  processes: 'pricing_processes',
  types: 'pricing_product_types'
};

type TableKey = keyof TableMap;

function isTableKey(candidate: any): candidate is TableKey {
  return Object.keys(tableMap).includes(candidate);
}

main()
  .then(() => process.exit())
  .catch((err: Error) => {
    log(err.message);
    process.exit(2);
  });

async function main(): Promise<void> {
  if (!isTableKey(cli.flags.table)) {
    throw new Error(`You must pass in a valid table name.\n${HELP_TEXT}`);
  }
  if (!fs.existsSync(cli.input[0])) {
    throw new Error('Input file not found');
  }

  const csvText = fs.readFileSync(cli.input[0]).toString();
  const raw = parse(csvText, { columns: true });
  const tableName = tableMap[cli.flags.table];
  const latestVersion = await getLatestVersion(tableName);
  const casted = castFromRaw(tableName, latestVersion, raw);

  if (!casted) {
    throw new Error('Could not properly parse csv into row type');
  }

  const query = buildInsertQuery(tableName, casted);
  if (cli.flags.verbose) {
    log(query.toString());
  }

  if (cli.flags.dryRun) {
    return;
  }

  let isConfirmed = cli.flags.force;
  if (!isConfirmed) {
    const confirmInsert = await ask(rl, `
Are you sure you want to insert ${casted.length} rows into ${tableName}? If so, please confirm
by typing '${tableName.toUpperCase()}': `);
    if (confirmInsert === tableName.toUpperCase()) {
      isConfirmed = true;
    } else {
      isConfirmed = false;
    }
  }

  if (!isConfirmed) {
    return;
  }

  const insertResult = await query;

  if (cli.flags.verbose) {
    log(`Inserted ${JSON.stringify(insertResult.length)} rows at version ${latestVersion + 1}`);
  }
}

function ask(readlineInterface: readline.ReadLine, question: string): Promise<string> {
  return new Promise((resolve: (value: string) => void): void => {
    readlineInterface.question(question, resolve);
  });
}

async function getLatestVersion(tableName: string): Promise<number> {
  const row = await db(tableName).max('version').first();

  return row.max !== null ? row.max : -1;
}

function buildInsertQuery(tableName: string, casted: DomainObject[]): Knex.QueryBuilder {
  return db(tableName)
    .insert(casted, 'id');
}

function castFromRaw(
  tableName: string,
  latestVersion: number,
  raw: object[]
): DomainObject[] | null {
  if (tableName === 'pricing_constants' && everyRawConstants(raw)) {
    return raw.map(toConstants.bind(null, latestVersion));
  }

  if (tableName === 'pricing_product_types' && everyRawType(raw)) {
    return raw.map(toType.bind(null, latestVersion));
  }

  if (tableName === 'pricing_care_labels' && everyRawLabel(raw)) {
    return raw.map(toLabel.bind(null, latestVersion));
  }

  return null;
}

function isRawConstants(candidate: object): candidate is RawConstants {
  return hasOnlyProperties(
    candidate,
    'branded_labels_additional_cents',
    'branded_labels_minimum_cents',
    'branded_labels_minimum_units',
    'grading_cents',
    'marking_cents',
    'pattern_revision_cents',
    'sample_minimum_cents',
    'technical_design_cents',
    'working_session_cents'
  );
}
function everyRawConstants(candidate: object[]): candidate is RawConstants[] {
  return candidate.every(isRawConstants);
}

function isRawType(candidate: object): candidate is RawType {
  return hasOnlyProperties(
    candidate,
    'minimum_units',
    'name',
    'pattern_minimum_cents',
    'complexity',
    'unit_cents',
    'yield',
    'contrast'
  );
}
function everyRawType(candidate: object[]): candidate is RawType[] {
  return candidate.every(isRawType);
}

function isRawLabel(candidate: object): candidate is RawLabel {
  return hasOnlyProperties(
    candidate,
    'minimum_units',
    'unit_cents'
  );
}
function everyRawLabel(candidate: object[]): candidate is RawLabel[] {
  return candidate.every(isRawLabel);
}

function toConstants(latestVersion: number, raw: RawConstants): PricingConstantRow {
  return {
    branded_labels_additional_cents: parseInt(raw.branded_labels_additional_cents, 10),
    branded_labels_minimum_cents: parseInt(raw.branded_labels_minimum_cents, 10),
    branded_labels_minimum_units: parseInt(raw.branded_labels_minimum_units, 10),
    created_at: new Date(),
    grading_cents: parseInt(raw.grading_cents, 10),
    id: uuid.v4(),
    marking_cents: parseInt(raw.marking_cents, 10),
    pattern_revision_cents: parseInt(raw.pattern_revision_cents, 10),
    sample_minimum_cents: parseInt(raw.sample_minimum_cents, 10),
    technical_design_cents: parseInt(raw.technical_design_cents, 10),
    version: latestVersion + 1,
    working_session_cents: parseInt(raw.working_session_cents, 10)
  };
}

function toType(latestVersion: number, raw: RawType): PricingProductTypeRow {
  return {
    complexity: raw.complexity,
    contrast: parseInt(raw.contrast, 10),
    created_at: new Date(),
    id: uuid.v4(),
    minimum_units: parseInt(raw.minimum_units, 10),
    name: raw.name,
    pattern_minimum_cents: parseInt(raw.pattern_minimum_cents, 10),
    unit_cents: parseInt(raw.unit_cents, 10),
    version: latestVersion + 1,
    yield: parseInt(raw.yield, 10)
  };
}

function toLabel(latestVersion: number, raw: RawLabel): PricingCareLabelRow {
  return {
    created_at: new Date(),
    id: uuid.v4(),
    minimum_units: parseInt(raw.minimum_units, 10),
    unit_cents: parseInt(raw.unit_cents, 10),
    version: latestVersion + 1
  };
}
