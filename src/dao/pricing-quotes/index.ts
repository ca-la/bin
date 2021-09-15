import { find, omit, uniqBy } from "lodash";
import uuid from "node-uuid";
import Knex from "knex";
import db from "../../services/db";
import {
  isEvery,
  validate,
  validateEvery,
} from "../../services/validate-from-db";

import {
  QueryModifier,
  identity,
} from "../../services/cala-component/cala-dao";
import { Process } from "../../domain-objects/pricing";
import {
  BasePricingQuoteRequest,
  dataAdapter,
  isPricingQuoteRow,
  PricingProcessQuoteRow,
  PricingQuote,
  PricingQuoteCalculated,
  PricingQuoteInputRow,
  PricingQuoteRow,
  PricingQuoteValues,
} from "../../domain-objects/pricing-quote";
import PricingConstant, {
  dataAdapter as constantDataAdapter,
  isPricingConstantRow,
  PricingConstantRow,
} from "../../domain-objects/pricing-constant";
import PricingProductMaterial, {
  dataAdapter as materialDataAdapter,
  isPricingProductMaterialRow,
  PricingProductMaterialRow,
} from "../../domain-objects/pricing-product-material";
import {
  isPricingUnitMaterialRow,
  PricingUnitMaterialMultiple,
  PricingUnitMaterialMultipleRow,
} from "../../components/pricing-unit-material-multiple/types";
import { dataAdapter as pricingUnitMaterialMultipleDataAdapter } from "../../components/pricing-unit-material-multiple/adapter";
import PricingProductType, {
  dataAdapter as typeDataAdapter,
  isPricingProductTypeRow,
  PricingProductTypeRow,
} from "../../components/pricing-product-types/domain-object";
import PricingProcess, {
  dataAdapter as processDataAdapter,
  isPricingProcessRow,
  PricingProcessRow,
} from "../../domain-objects/pricing-process";
import PricingMargin, {
  dataAdapter as marginDataAdapter,
  isPricingMarginRow,
  PricingMarginRow,
} from "../../domain-objects/pricing-margin";
import PricingCareLabel, {
  dataAdapter as careLabelDataAdapter,
  isPricingCareLabelRow,
  PricingCareLabelRow,
} from "../../domain-objects/pricing-care-label";
import {
  PricingCostInput,
  UncomittedCostInput,
} from "../../components/pricing-cost-inputs/types";
import DataAdapter from "../../services/data-adapter";
import ResourceNotFoundError from "../../errors/resource-not-found";
import first from "../../services/first";
import PricingProcessTimeline, {
  dataAdapter as pricingProcessTimelineDataAdapter,
  isPricingProcessTimelineRow,
  PricingProcessTimelineRow,
} from "../../components/pricing-process-timeline/domain-object";

type TableName =
  | "pricing_care_labels"
  | "pricing_constants"
  | "pricing_product_materials"
  | "pricing_unit_material_multiples"
  | "pricing_product_types"
  | "pricing_processes"
  | "pricing_margins"
  | "pricing_inputs";

type NormalizedPricingQuote = Omit<PricingQuote, "processes">;
const encodeNormalizedPricingQuote = (
  row: PricingQuoteRow
): NormalizedPricingQuote => ({
  id: row.id,
  preProductionTimeMs: Number(row.pre_production_time_ms),
  pricingQuoteInputId: row.pricing_quote_input_id,
  createdAt: row.created_at,
  productType: row.product_type,
  productComplexity: row.product_complexity,
  materialCategory: row.material_category,
  materialBudgetCents: row.material_budget_cents,
  units: row.units,
  baseCostCents: row.base_cost_cents,
  materialCostCents: row.material_cost_cents,
  processCostCents: row.process_cost_cents,
  unitCostCents: row.unit_cost_cents,
  productionFeeCents: row.production_fee_cents,
  designId: row.design_id,
  creationTimeMs: Number(row.creation_time_ms),
  specificationTimeMs: Number(row.specification_time_ms),
  sourcingTimeMs: Number(row.sourcing_time_ms),
  samplingTimeMs: Number(row.sampling_time_ms),
  productionTimeMs: Number(row.production_time_ms),
  processTimeMs: Number(row.process_time_ms),
  fulfillmentTimeMs: Number(row.fulfillment_time_ms),
});

const normalizedPricingQuoteAdapter = new DataAdapter<
  PricingQuoteRow,
  NormalizedPricingQuote
>(encodeNormalizedPricingQuote);

interface CreatePricingQuote
  extends BasePricingQuoteRequest,
    PricingQuoteCalculated {
  pricingQuoteInputId: string;
}

export async function create(
  quote: CreatePricingQuote,
  ktx: Knex = db
): Promise<NormalizedPricingQuote> {
  const TABLE_NAME = "pricing_quotes";
  const data = dataAdapter.forInsertion({
    ...quote,
    id: uuid.v4(),
    processes: [],
  });
  const created = await ktx(TABLE_NAME)
    .insert(omit(data, ["processes"]))
    .returning("*")
    .then((rows: PricingQuoteRow[]) => first(rows));

  if (created && isPricingQuoteRow(created)) {
    return normalizedPricingQuoteAdapter.parse(created);
  }

  throw new Error("There was a problem saving the pricing quote");
}

export async function findMatchingOrCreateInput(
  input: Uninserted<PricingQuoteInputRow>
): Promise<PricingQuoteInputRow | undefined> {
  const TABLE_NAME = "pricing_inputs";
  const maybeMatch: PricingQuoteInputRow | null = await db(TABLE_NAME)
    .first()
    .where(omit(input, ["id"]));

  if (maybeMatch) {
    return maybeMatch;
  }

  return db(TABLE_NAME)
    .insert(input)
    .returning("*")
    .then((rows: PricingQuoteInputRow[]) => first(rows));
}

export async function findVersionValuesForRequest(
  costInput: PricingCostInput,
  units: number
): Promise<PricingQuoteValues> {
  // tslint:disable-next-line: no-console
  console.log(
    "findVersionValuesFromRequest:",
    JSON.stringify(costInput, null, 2)
  );

  const constant = await findConstants(costInput.constantsVersion);
  const careLabel = await findCareLabel(units, costInput.careLabelsVersion);
  const material = await findProductMaterial(
    costInput.materialCategory,
    units,
    costInput.productMaterialsVersion
  );
  const unitMaterialMultiple = await findProductUnitMaterialMultiple(
    units,
    costInput.unitMaterialMultipleVersion
  );
  const type = await findProductType(
    costInput.productType,
    costInput.productComplexity,
    units,
    costInput.productTypeVersion
  );
  const sample = await findProductType(
    costInput.productType,
    costInput.productComplexity,
    1,
    costInput.productTypeVersion
  );

  const processes = await findProcesses(
    costInput.processes,
    units,
    costInput.processesVersion
  );
  const processTimeline = await findProcessTimeline(
    costInput.processes,
    units,
    costInput.processTimelinesVersion
  );
  const margin = await findMargin(units, costInput.marginVersion);

  const { id: constantId, ...pricingValues } = constant;

  return {
    careLabel,
    constantId,
    margin,
    material,
    unitMaterialMultiple,
    processTimeline,
    processes,
    sample,
    type,
    ...omit(pricingValues, "createdAt", "version"),
  };
}

export async function findLatestValuesForRequest(
  costInput: UncomittedCostInput,
  units: number
): Promise<PricingQuoteValues> {
  const latestConstant = await findConstants();
  const careLabel = await findCareLabel(units);
  const material = await findProductMaterial(costInput.materialCategory, units);
  const unitMaterialMultiple = await findProductUnitMaterialMultiple(units);
  const type = await findProductType(
    costInput.productType,
    costInput.productComplexity,
    units
  );
  const sample = await findProductType(
    costInput.productType,
    costInput.productComplexity,
    1
  );
  const processes = await findProcesses(costInput.processes, units);
  const processTimeline = await findProcessTimeline(costInput.processes, units);
  const margin = await findMargin(units);

  const { id: constantId, ...pricingValues } = latestConstant;

  return {
    careLabel,
    constantId,
    margin,
    material,
    unitMaterialMultiple,
    processTimeline,
    processes,
    sample,
    type,
    ...omit(pricingValues, "createdAt", "version"),
  };
}

export async function createPricingProcesses(
  processRows: Uninserted<PricingProcessQuoteRow>[],
  ktx: Knex = db
): Promise<PricingProcess[]> {
  const TABLE_NAME = "pricing_quote_processes";
  return ktx(TABLE_NAME).insert(processRows, "*");
}

async function attachProcesses(
  quoteRow: PricingQuoteRow,
  trx?: Knex.Transaction
): Promise<PricingQuote> {
  const processes: object[] = await db("pricing_quote_processes")
    .select("pricing_processes.*")
    .leftJoin(
      "pricing_processes",
      "pricing_quote_processes.pricing_process_id",
      "pricing_processes.id"
    )
    .where({ "pricing_quote_processes.pricing_quote_id": quoteRow.id })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return Object.assign(
    {
      processes: isEvery(isPricingProcessRow, processes)
        ? processes.map((p: PricingProcessRow) => processDataAdapter.parse(p))
        : [],
    },
    normalizedPricingQuoteAdapter.parse(quoteRow)
  );
}

export async function findById(id: string): Promise<PricingQuote | null> {
  const TABLE_NAME = "pricing_quotes";
  const quote: object | null = await db(TABLE_NAME).first().where({ id });

  if (!quote || !isPricingQuoteRow(quote)) {
    return null;
  }

  return attachProcesses(quote);
}

export async function findByDesignId(
  designId: string,
  trx?: Knex.Transaction,
  modifier: QueryModifier = identity
): Promise<PricingQuote[] | null> {
  const TABLE_NAME = "pricing_quotes";
  const quotes: object[] = await db(TABLE_NAME)
    .where({ design_id: designId })
    .orderBy("created_at", "DESC")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .modify(modifier);

  if (!quotes.every(isPricingQuoteRow)) {
    return null;
  }

  return Promise.all(
    (quotes as PricingQuoteRow[]).map((row: PricingQuoteRow) =>
      attachProcesses(row, trx)
    )
  );
}

export async function findByDesignIds(
  designIds: string[]
): Promise<PricingQuote[] | null> {
  const TABLE_NAME = "pricing_quotes";
  const quotes: object[] = await db(TABLE_NAME).whereIn("design_id", designIds);

  if (!quotes.every(isPricingQuoteRow)) {
    return null;
  }

  return Promise.all(
    (quotes as PricingQuoteRow[]).map((row: PricingQuoteRow) =>
      attachProcesses(row)
    )
  );
}

async function findCareLabel(
  units: number,
  version?: number
): Promise<PricingCareLabel> {
  const TABLE_NAME = "pricing_care_labels";
  const careLabelRow: PricingCareLabelRow | null = await findAtVersionOrLatest(
    TABLE_NAME,
    units,
    version
  );

  if (!careLabelRow) {
    throw new ResourceNotFoundError("Pricing care label does not exist!");
  }

  return validate(
    TABLE_NAME,
    isPricingCareLabelRow,
    careLabelDataAdapter,
    careLabelRow
  );
}

async function findConstants(version?: number): Promise<PricingConstant> {
  const TABLE_NAME = "pricing_constants";
  const constantRow: PricingConstantRow | null = await db(TABLE_NAME)
    .first()
    .modify((query: Knex.QueryBuilder) => {
      if (version) {
        query.where({ version });
      }
    })
    .orderBy("created_at", "desc");

  if (!constantRow) {
    throw new ResourceNotFoundError("Pricing constant could not be found!");
  }

  return validate(
    TABLE_NAME,
    isPricingConstantRow,
    constantDataAdapter,
    constantRow
  );
}

async function findProductMaterial(
  category: string,
  units: number,
  version?: number
): Promise<PricingProductMaterial> {
  const TABLE_NAME = "pricing_product_materials";
  const materialRow: PricingProductMaterialRow | null = await findAtVersionOrLatest(
    TABLE_NAME,
    units,
    version
  ).where({ category });

  if (!materialRow) {
    throw new ResourceNotFoundError(
      "Pricing product material could not be found!"
    );
  }

  return validate(
    TABLE_NAME,
    isPricingProductMaterialRow,
    materialDataAdapter,
    materialRow
  );
}

async function findProductUnitMaterialMultiple(
  units: number,
  version?: number
): Promise<PricingUnitMaterialMultiple> {
  const TABLE_NAME = "pricing_unit_material_multiples";
  const unitMaterialMultipleRow: PricingUnitMaterialMultipleRow | null = await findAtVersionOrLatest(
    TABLE_NAME,
    units,
    version
  );

  if (!unitMaterialMultipleRow) {
    throw new ResourceNotFoundError(
      "Pricing unit material multiple could not be found!"
    );
  }

  return validate(
    TABLE_NAME,
    isPricingUnitMaterialRow,
    pricingUnitMaterialMultipleDataAdapter,
    unitMaterialMultipleRow
  );
}

async function findProductType(
  name: string,
  complexity: string,
  units: number,
  version?: number
): Promise<PricingProductType> {
  const TABLE_NAME = "pricing_product_types";
  const typeRow: PricingProductTypeRow | null = await findAtVersionOrLatest(
    TABLE_NAME,
    units,
    version
  ).where({ name, complexity });

  if (!typeRow) {
    throw new ResourceNotFoundError("Pricing product type could not be found!");
  }

  return validate(
    TABLE_NAME,
    isPricingProductTypeRow,
    typeDataAdapter,
    typeRow
  );
}

async function findProcesses(
  processes: Process[],
  units: number,
  version?: number
): Promise<PricingProcess[]> {
  const TABLE_NAME = "pricing_processes";
  if (processes.length === 0) {
    return [];
  }
  const distinctProcesses = uniqBy(
    processes,
    (process: Process): string => process.name + process.complexity
  );

  const getProcessQuery = (process: Process): Knex.QueryBuilder =>
    db(TABLE_NAME)
      .select()
      .where(process)
      .modify((modifyQuery: Knex.QueryBuilder) => {
        if (version) {
          modifyQuery.where({ version });
        } else {
          modifyQuery.whereIn("version", db(TABLE_NAME).max("version"));
        }
      })
      .whereIn(
        "minimum_units",
        db(TABLE_NAME)
          .where("minimum_units", "<=", units)
          .andWhere(process)
          .modify((modifyQuery: Knex.QueryBuilder) => {
            if (version) {
              modifyQuery.where({ version });
            } else {
              modifyQuery.whereIn("version", db(TABLE_NAME).max("version"));
            }
          })
          .max("minimum_units")
      );

  const query = getProcessQuery(processes[0]);
  const rest = processes.slice(1);

  if (rest.length > 0) {
    rest.forEach(
      (process: Process): Knex.QueryBuilder =>
        query.union(getProcessQuery(process))
    );
  }

  const processRows: any[] = await query;

  if (processRows.length !== distinctProcesses.length) {
    throw new ResourceNotFoundError(`Could not find all processes:
Requested processes: ${JSON.stringify(processes, null, 4)}
Found processes: ${JSON.stringify(processRows, null, 4)}`);
  }

  return validateEvery(
    "pricing_processes",
    isPricingProcessRow,
    processDataAdapter,
    processes.map(
      (process: Process): PricingProcessRow => {
        // lodash thinks process is a function since it has a name property
        return find(processRows, process as object);
      }
    )
  );
}

async function findProcessTimeline(
  processes: Process[],
  units: number,
  version?: number
): Promise<PricingProcessTimeline | null> {
  if (processes.length === 0) {
    return null;
  }
  const TABLE_NAME = "pricing_process_timelines";
  const uniqueProcesses = uniqBy(
    processes,
    (process: Process): string => process.name
  ).length;

  const processTimelineRow = await db(TABLE_NAME)
    .select()
    .where("unique_processes", "<=", uniqueProcesses)
    .modify((modifyQuery: Knex.QueryBuilder) => {
      if (version) {
        modifyQuery.where({ version });
      } else {
        modifyQuery.whereIn("version", db(TABLE_NAME).max("version"));
      }
    })
    .whereIn(
      "unique_processes",
      db(TABLE_NAME)
        .where("unique_processes", "<=", uniqueProcesses)
        .max("unique_processes")
        .modify((modifyQuery: Knex.QueryBuilder) => {
          if (version) {
            modifyQuery.where({ version });
          } else {
            modifyQuery.whereIn("version", db(TABLE_NAME).max("version"));
          }
        })
    )
    .whereIn(
      "minimum_units",
      db(TABLE_NAME)
        .where("minimum_units", "<=", units)
        .max("minimum_units")
        .modify((modifyQuery: Knex.QueryBuilder) => {
          if (version) {
            modifyQuery.where({ version });
          } else {
            modifyQuery.whereIn("version", db(TABLE_NAME).max("version"));
          }
        })
    )
    .then((rows: PricingProcessTimelineRow[]) =>
      first<PricingProcessTimelineRow>(rows)
    );

  if (!processTimelineRow) {
    return null;
  }

  return validate(
    TABLE_NAME,
    isPricingProcessTimelineRow,
    pricingProcessTimelineDataAdapter,
    processTimelineRow
  );
}

async function findMargin(
  units: number,
  version?: number
): Promise<PricingMargin> {
  const TABLE_NAME = "pricing_margins";
  const marginRow: PricingMarginRow | null = await findAtVersionOrLatest(
    TABLE_NAME,
    units,
    version
  );

  if (!marginRow) {
    throw new ResourceNotFoundError("Pricing margin does not exist!");
  }

  return validate(TABLE_NAME, isPricingMarginRow, marginDataAdapter, marginRow);
}

function findAtVersionOrLatest(
  from: TableName,
  units: number,
  version?: number
): Knex.QueryBuilder {
  return db(from)
    .first()
    .modify((modifyQuery: Knex.QueryBuilder) => {
      if (typeof version === "number") {
        modifyQuery.where({ version });
      } else {
        modifyQuery.whereIn("version", db(from).max("version"));
      }
    })
    .andWhere("minimum_units", "<=", units)
    .orderBy("minimum_units", "desc");
}
