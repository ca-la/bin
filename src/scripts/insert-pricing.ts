import readline from "readline";
import process from "process";
import fs from "fs";
import uuid from "node-uuid";
import meow from "meow";
import parse from "csv-parse/lib/sync";
import Knex from "knex";
import { isEqual, uniqWith, chunk } from "lodash";

import db from "../services/db";
import { hasOnlyProperties } from "../services/require-properties";
import { log } from "../services/logger";
import { PricingCareLabelRow } from "../domain-objects/pricing-care-label";
import { PricingConstantRow } from "../domain-objects/pricing-constant";
import { PricingMarginRow } from "../domain-objects/pricing-margin";
import { PricingProcessRow } from "../domain-objects/pricing-process";
import { PricingProcessTimelineRow } from "../components/pricing-process-timeline/domain-object";
import { PricingProductMaterialRow } from "../domain-objects/pricing-product-material";
import { PricingProductTypeRow } from "../components/pricing-product-types/domain-object";
import { ProductType, validProductTypes } from "../domain-objects/pricing";

const CHUNK_SIZE = 2000;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

type Stringly<T extends { id: any; created_at: any; version: any }> = {
  [P in keyof Omit<T, "id" | "created_at" | "version">]: string;
};

type RawConstants = Stringly<PricingConstantRow>;
type RawType = Stringly<PricingProductTypeRow>;
type RawLabel = Stringly<PricingCareLabelRow>;
type RawMargin = Stringly<PricingMarginRow>;
type RawProcess = Stringly<PricingProcessRow>;
type RawProcessTimeline = Stringly<PricingProcessTimelineRow>;
type RawMaterial = Stringly<PricingProductMaterialRow>;
type DomainObject =
  | PricingConstantRow
  | PricingProductTypeRow
  | PricingCareLabelRow
  | PricingMarginRow
  | PricingProcessRow
  | PricingProcessTimelineRow
  | PricingProductMaterialRow;

// tslint:disable:max-line-length
const HELP_TEXT = `
  Insert pricing values into pricing tables

  Usage
    $ insert-pricing [input csv file]

  Options
  --table, -t      REQUIRED One of: constants, labels, margins, processTimelines, processes, types, material
  --quiet, -q      Suppress output
  --force, -f      Do not ask for user confirmation
  --dry-run        Only print the query, do not execute
`;
// tslint:enable:max-line-length

const cli = meow(HELP_TEXT, {
  flags: {
    dryRun: {
      default: false,
      type: "boolean",
    },
    force: {
      alias: "f",
      default: false,
      type: "boolean",
    },
    table: {
      alias: "t",
      type: "string",
    },
    verbose: {
      alias: "v",
      default: true,
      type: "boolean",
    },
  },
});

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
  constants: "pricing_constants",
  labels: "pricing_care_labels",
  margins: "pricing_margins",
  materials: "pricing_product_materials",
  processTimelines: "pricing_process_timelines",
  processes: "pricing_processes",
  types: "pricing_product_types",
};

type TableKey = keyof TableMap;

function isTableKey(candidate: any): candidate is TableKey {
  return Object.keys(tableMap).includes(candidate);
}

function isProductType(candidate: string): candidate is ProductType {
  return validProductTypes.indexOf(candidate as ProductType) > -1;
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
    throw new Error("Input file not found");
  }

  const csvText = fs.readFileSync(cli.input[0]).toString();
  const raw = parse(csvText, { columns: true });
  const deduplicated = uniqWith(raw, isEqual);
  const tableName = tableMap[cli.flags.table];
  const latestVersion = await getLatestVersion(tableName);
  const casted = castFromRaw(tableName, latestVersion, deduplicated);

  if (!casted) {
    throw new Error("Could not properly parse csv into row type");
  }

  if (cli.flags.verbose) {
    await db.transaction(async (trx: Knex.Transaction) => {
      for (const c of chunk(casted, CHUNK_SIZE)) {
        log(buildInsertQuery(trx, tableName, c).toString());
      }
    });
  }

  if (cli.flags.dryRun) {
    return;
  }

  let isConfirmed = cli.flags.force;
  if (!isConfirmed) {
    const confirmInsert = await ask(
      rl,
      `
Are you sure you want to insert ${
        casted.length
      } rows into ${tableName}? If so, please confirm
by typing '${tableName.toUpperCase()}': `
    );
    if (confirmInsert === tableName.toUpperCase()) {
      isConfirmed = true;
    } else {
      isConfirmed = false;
    }
  }

  if (!isConfirmed) {
    return;
  }

  let count = 0;
  await db.transaction(async (trx: Knex.Transaction) => {
    for (const c of chunk(casted, CHUNK_SIZE)) {
      log(`Creating ${c.length} ${tableName}`);
      count += c.length;
      await buildInsertQuery(trx, tableName, c);
    }
    return count;
  });

  if (cli.flags.verbose) {
    log(`${raw.length - deduplicated.length} duplicate rows removed.`);
    log(
      `Inserted ${JSON.stringify(count)} rows at version ${latestVersion + 1}`
    );
  }
}

function ask(
  readlineInterface: readline.ReadLine,
  question: string
): Promise<string> {
  return new Promise((resolve: (value: string) => void): void => {
    readlineInterface.question(question, resolve);
  });
}

async function getLatestVersion(tableName: string): Promise<number> {
  const row = await db(tableName).max("version").first();

  return row.max !== null ? row.max : -1;
}

function buildInsertQuery(
  trx: Knex.Transaction,
  tableName: string,
  casted: DomainObject[]
): Knex.QueryBuilder {
  return trx(tableName).insert(casted, "id");
}

function castFromRaw(
  tableName: string,
  latestVersion: number,
  raw: object[]
): DomainObject[] | null {
  if (tableName === "pricing_constants" && isEveryRawConstants(raw)) {
    return raw.map(toConstants.bind(null, latestVersion));
  }

  if (tableName === "pricing_product_types" && isEveryRawType(raw)) {
    return raw.map(toType.bind(null, latestVersion));
  }

  if (tableName === "pricing_care_labels" && isEveryRawLabel(raw)) {
    return raw.map(toLabel.bind(null, latestVersion));
  }

  if (tableName === "pricing_margins" && isEveryRawMargin(raw)) {
    return raw.map(toMargin.bind(null, latestVersion));
  }

  if (tableName === "pricing_processes" && isEveryRawProcess(raw)) {
    return raw.map(toProcess.bind(null, latestVersion));
  }

  if (
    tableName === "pricing_process_timelines" &&
    isEveryRawProcessTimeline(raw)
  ) {
    return raw.map(toProcessTimeline.bind(null, latestVersion));
  }

  if (tableName === "pricing_product_materials" && isEveryRawMaterial(raw)) {
    return raw.map(toMaterial.bind(null, latestVersion));
  }

  return null;
}

function isRawConstants(candidate: object): candidate is RawConstants {
  return hasOnlyProperties(
    candidate,
    "branded_labels_additional_cents",
    "branded_labels_minimum_cents",
    "branded_labels_minimum_units",
    "grading_cents",
    "marking_cents",
    "pattern_revision_cents",
    "sample_minimum_cents",
    "technical_design_cents",
    "working_session_cents"
  );
}
function isEveryRawConstants(candidate: object[]): candidate is RawConstants[] {
  return candidate.every(isRawConstants);
}

function isRawType(candidate: object): candidate is RawType {
  return hasOnlyProperties(
    candidate,
    "minimum_units",
    "name",
    "pattern_minimum_cents",
    "complexity",
    "unit_cents",
    "yield",
    "contrast",
    "creation_time_ms",
    "specification_time_ms",
    "sourcing_time_ms",
    "sampling_time_ms",
    "pre_production_time_ms",
    "production_time_ms",
    "fulfillment_time_ms"
  );
}
function isEveryRawType(candidate: object[]): candidate is RawType[] {
  return candidate.every(isRawType);
}

function isRawLabel(candidate: object): candidate is RawLabel {
  return hasOnlyProperties(candidate, "minimum_units", "unit_cents");
}
function isEveryRawLabel(candidate: object[]): candidate is RawLabel[] {
  return candidate.every(isRawLabel);
}

function isRawMargin(candidate: object): candidate is RawMargin {
  return hasOnlyProperties(candidate, "minimum_units", "margin");
}
function isEveryRawMargin(candidate: object[]): candidate is RawMargin[] {
  return candidate.every(isRawMargin);
}

function isRawMaterial(candidate: object): candidate is RawMaterial {
  return hasOnlyProperties(
    candidate,
    "minimum_units",
    "category",
    "unit_cents"
  );
}
function isEveryRawMaterial(candidate: object[]): candidate is RawMaterial[] {
  return candidate.every(isRawMaterial);
}

function isRawProcess(candidate: object): candidate is RawProcess {
  return hasOnlyProperties(
    candidate,
    "name",
    "display_name",
    "minimum_units",
    "complexity",
    "setup_cents",
    "unit_cents"
  );
}
function isEveryRawProcess(candidate: object[]): candidate is RawProcess[] {
  return candidate.every(isRawProcess);
}

function isRawProcessTimeline(candidate: object): candidate is RawProcess {
  return hasOnlyProperties(
    candidate,
    "minimum_units",
    "unique_processes",
    "time_ms"
  );
}
function isEveryRawProcessTimeline(
  candidate: object[]
): candidate is RawProcessTimeline[] {
  return candidate.every(isRawProcessTimeline);
}

function toConstants(
  latestVersion: number,
  raw: RawConstants
): PricingConstantRow {
  return {
    branded_labels_additional_cents: parseInt(
      raw.branded_labels_additional_cents,
      10
    ),
    branded_labels_minimum_cents: parseInt(
      raw.branded_labels_minimum_cents,
      10
    ),
    branded_labels_minimum_units: parseInt(
      raw.branded_labels_minimum_units,
      10
    ),
    created_at: new Date(),
    grading_cents: parseInt(raw.grading_cents, 10),
    id: uuid.v4(),
    marking_cents: parseInt(raw.marking_cents, 10),
    pattern_revision_cents: parseInt(raw.pattern_revision_cents, 10),
    sample_minimum_cents: parseInt(raw.sample_minimum_cents, 10),
    technical_design_cents: parseInt(raw.technical_design_cents, 10),
    version: latestVersion + 1,
    working_session_cents: parseInt(raw.working_session_cents, 10),
  };
}

function toType(latestVersion: number, raw: RawType): PricingProductTypeRow {
  if (!isProductType(raw.name)) {
    throw new Error(`${raw.name} is not a valid product type`);
  }

  return {
    complexity: raw.complexity,
    contrast: parseInt(raw.contrast, 10),
    created_at: new Date().toISOString(),
    creation_time_ms: raw.creation_time_ms,
    fulfillment_time_ms: raw.fulfillment_time_ms,
    id: uuid.v4(),
    minimum_units: parseInt(raw.minimum_units, 10),
    name: raw.name,
    pattern_minimum_cents: parseInt(raw.pattern_minimum_cents, 10),
    pre_production_time_ms: raw.pre_production_time_ms,
    production_time_ms: raw.production_time_ms,
    sampling_time_ms: raw.sampling_time_ms,
    sourcing_time_ms: raw.sourcing_time_ms,
    specification_time_ms: raw.specification_time_ms,
    unit_cents: parseInt(raw.unit_cents, 10),
    version: latestVersion + 1,
    yield: parseInt(raw.yield, 10),
  };
}

function toLabel(latestVersion: number, raw: RawLabel): PricingCareLabelRow {
  return {
    created_at: new Date(),
    id: uuid.v4(),
    minimum_units: parseInt(raw.minimum_units, 10),
    unit_cents: parseInt(raw.unit_cents, 10),
    version: latestVersion + 1,
  };
}

function toMargin(latestVersion: number, raw: RawMargin): PricingMarginRow {
  return {
    created_at: new Date(),
    id: uuid.v4(),
    margin: Number(raw.margin),
    minimum_units: parseInt(raw.minimum_units, 10),
    version: latestVersion + 1,
  };
}

function toMaterial(
  latestVersion: number,
  raw: RawMaterial
): PricingProductMaterialRow {
  return {
    created_at: new Date(),
    id: uuid.v4(),
    category: raw.category,
    minimum_units: parseInt(raw.minimum_units, 10),
    unit_cents: parseInt(raw.unit_cents, 10),
    version: latestVersion + 1,
  };
}

function toProcess(latestVersion: number, raw: RawProcess): PricingProcessRow {
  return {
    complexity: raw.complexity,
    created_at: new Date(),
    id: uuid.v4(),
    minimum_units: Number(raw.minimum_units),
    name: raw.name,
    setup_cents: Number(raw.setup_cents),
    unit_cents: Number(raw.unit_cents),
    version: latestVersion + 1,
    display_name: raw.display_name,
  };
}

function toProcessTimeline(
  latestVersion: number,
  raw: RawProcessTimeline
): PricingProcessTimelineRow {
  return {
    created_at: new Date().toISOString(),
    id: uuid.v4(),
    minimum_units: Number(raw.minimum_units),
    time_ms: raw.time_ms,
    unique_processes: Number(raw.unique_processes),
    version: latestVersion + 1,
  };
}
