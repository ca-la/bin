import Knex from "knex";
import { isMatch, uniqBy, omit } from "lodash";
import DataAdapter from "../../services/data-adapter";
import ResourceNotFoundError from "../../errors/resource-not-found";
import { validateEvery } from "../validate-from-db";
import { CreateQuotePayload } from "./types";
import { PricingCostInput } from "../../components/pricing-cost-inputs/types";
import PricingConstant, {
  dataAdapter as constantDataAdapter,
  isPricingConstantRow,
} from "../../domain-objects/pricing-constant";
import {
  Complexity,
  MaterialCategory,
  Process,
  ProductType,
} from "../../domain-objects/pricing";
import PricingProductMaterial, {
  dataAdapter as materialDataAdapter,
  isPricingProductMaterialRow,
} from "../../domain-objects/pricing-product-material";
import {
  isPricingUnitMaterialRow,
  PricingUnitMaterialMultiple,
} from "../../components/pricing-unit-material-multiple/types";
import { dataAdapter as pricingUnitMaterialMultipleDataAdapter } from "../../components/pricing-unit-material-multiple/adapter";
import PricingProductType, {
  dataAdapter as typeDataAdapter,
  isPricingProductTypeRow,
} from "../../components/pricing-product-types/domain-object";
import PricingProcess, {
  dataAdapter as processDataAdapter,
  isPricingProcessRow,
} from "../../domain-objects/pricing-process";
import PricingProcessTimeline, {
  dataAdapter as pricingProcessTimelineDataAdapter,
  isPricingProcessTimelineRow,
} from "../../components/pricing-process-timeline/domain-object";
import PricingMargin, {
  dataAdapter as marginDataAdapter,
  isPricingMarginRow,
} from "../../domain-objects/pricing-margin";
import PricingCareLabel, {
  dataAdapter as careLabelDataAdapter,
  isPricingCareLabelRow,
} from "../../domain-objects/pricing-care-label";
import { PricingQuoteValues } from "../../domain-objects/pricing-quote";

export interface QuoteValuesPool {
  constants: PricingConstant[];
  materials: PricingProductMaterial[];
  unitMaterialMultiples: PricingUnitMaterialMultiple[];
  productTypes: PricingProductType[];
  processes: PricingProcess[];
  processTimelines: PricingProcessTimeline[];
  margins: PricingMargin[];
  careLabels: PricingCareLabel[];
}

export class DeepEqualSet<T> extends Set<string> {
  public addItem(item: T) {
    return super.add(JSON.stringify(item));
  }
  public toArray(): T[] {
    const result: T[] = [];
    this.forEach((item: string) => {
      result.push(JSON.parse(item));
    });
    return result;
  }
}

export interface QuoteValueFilterBase {
  version: number;
  units: number;
}

export function basicValuePoolQuery<T extends QuoteValueFilterBase>(
  ktx: Knex,
  tableName: string,
  filters: T[]
) {
  const bindings: any[] = [];
  let maxUnits: number | null = null;

  if (filters.length === 0) {
    return ktx(tableName).orderBy("minimum_units", "desc");
  }

  const filtersString = filters
    .map((filter: T) => {
      const { units, ...rest } = filter;
      if (maxUnits === null || units > maxUnits) {
        maxUnits = units;
      }
      const keys = Object.keys(rest) as (keyof T)[];
      const conditions = keys.map((key: keyof T) => {
        bindings.push(filter[key]);
        return `${key}=?`;
      });
      return `${conditions.join(" AND ")}`;
    })
    .join(" OR ");

  return ktx(tableName)
    .andWhereRaw("minimum_units <= ?", [maxUnits])
    .andWhereRaw(`(${filtersString})`, bindings)
    .orderBy("minimum_units", "desc");
}

async function getValuesPool<
  T,
  TRow extends object,
  QuoteFilter extends QuoteValueFilterBase
>(
  ktx: Knex,
  filters: QuoteFilter[],
  tableName: string,
  validator: (item: any) => item is TRow,
  adapter: DataAdapter<TRow, T>,
  modifier?: (q: Knex.QueryBuilder) => Knex.QueryBuilder
) {
  const query = basicValuePoolQuery(ktx, tableName, filters).modify(
    (q: Knex.QueryBuilder) => {
      return modifier ? modifier(q) : q;
    }
  );

  const rows = await query;

  if (rows.length === 0) {
    throw new ResourceNotFoundError(
      `No appropriate pricing values in ${tableName} found!`
    );
  }

  return validateEvery<TRow, T>(tableName, validator, adapter, rows);
}

export type ProcessTimeLinePoolFilter = QuoteValueFilterBase & {
  unique_processes: number;
};

export function getProcessTimelinePoolQuery(
  ktx: Knex,
  filters: ProcessTimeLinePoolFilter[]
) {
  const TABLE_NAME = "pricing_process_timelines";
  const orderBy = [
    { column: "minimum_units", order: "desc" },
    { column: "unique_processes", order: "desc" },
  ];
  if (filters.length === 0) {
    return ktx(TABLE_NAME).orderBy(orderBy);
  }

  let maxUnits: number | null = null;
  let maxUniqueProcesses: number | null = null;
  const versionSet = new Set<number>();
  for (const { units, version, unique_processes } of filters) {
    if (maxUnits === null || units > maxUnits) {
      maxUnits = units;
    }
    if (maxUniqueProcesses === null || unique_processes > maxUniqueProcesses) {
      maxUniqueProcesses = unique_processes;
    }
    versionSet.add(version);
  }

  return ktx(TABLE_NAME)
    .whereIn("version", Array.from(versionSet))
    .andWhereRaw("minimum_units <= ?", [maxUnits])
    .andWhereRaw("unique_processes <= ?", [maxUniqueProcesses])
    .orderBy(orderBy);
}

export async function getProcessTimelinePool(
  ktx: Knex,
  filters: ProcessTimeLinePoolFilter[]
) {
  const query = getProcessTimelinePoolQuery(ktx, filters);
  const rows = await query;

  if (!rows) {
    throw new ResourceNotFoundError(
      `No appropriate pricing values in pricing_process_timelines found!`
    );
  }

  return validateEvery(
    "pricing_process_timelines",
    isPricingProcessTimelineRow,
    pricingProcessTimelineDataAdapter,
    rows
  );
}

export async function buildQuoteValuesPool(
  ktx: Knex,
  quotePayloads: CreateQuotePayload[],
  costInputsByDesignId: Record<string, PricingCostInput>
): Promise<QuoteValuesPool> {
  const constantsFilter = new Set<number>();
  const careLabelFilter = new DeepEqualSet<QuoteValueFilterBase>();
  const materialFilter = new DeepEqualSet<
    QuoteValueFilterBase & {
      category: MaterialCategory;
    }
  >();
  const productTypeFilter = new DeepEqualSet<
    QuoteValueFilterBase & {
      name: ProductType;
      complexity: Complexity;
    }
  >();
  const marginFilter = new DeepEqualSet<QuoteValueFilterBase>();
  const unitMaterialMultipleFilter = new DeepEqualSet<QuoteValueFilterBase>();
  const processFilter = new DeepEqualSet<QuoteValueFilterBase & Process>();
  const processTimelineFilter = new DeepEqualSet<ProcessTimeLinePoolFilter>();
  for (const payload of quotePayloads) {
    const { designId, units } = payload;
    const latestInput = costInputsByDesignId[designId];
    if (!latestInput) {
      throw new Error(
        `No costing inputs associated with the design #${designId}`
      );
    }
    constantsFilter.add(latestInput.constantsVersion);
    careLabelFilter.addItem({ version: latestInput.careLabelsVersion, units });
    marginFilter.addItem({ version: latestInput.marginVersion, units });
    materialFilter.addItem({
      version: latestInput.productMaterialsVersion,
      units,
      category: latestInput.materialCategory,
    });
    productTypeFilter.addItem({
      version: latestInput.productTypeVersion,
      units,
      name: latestInput.productType,
      complexity: latestInput.productComplexity,
    });
    productTypeFilter.addItem({
      version: latestInput.productTypeVersion,
      units: 1,
      name: latestInput.productType,
      complexity: latestInput.productComplexity,
    });
    for (const process of latestInput.processes) {
      processFilter.addItem({
        version: latestInput.processesVersion,
        units,
        ...process,
      });
    }
    const uniqueProcesses = uniqBy(
      latestInput.processes,
      (process: Process): string => process.name
    );
    processTimelineFilter.addItem({
      version: latestInput.processTimelinesVersion,
      units,
      unique_processes: uniqueProcesses.length,
    });
  }

  const constantRows = await ktx("pricing_constants").whereIn(
    "version",
    Array.from(constantsFilter)
  );

  const constants = validateEvery(
    "pricing_constants",
    isPricingConstantRow,
    constantDataAdapter,
    constantRows
  );

  const careLabels = await getValuesPool(
    ktx,
    careLabelFilter.toArray(),
    "pricing_care_labels",
    isPricingCareLabelRow,
    careLabelDataAdapter
  );

  const materials = await getValuesPool(
    ktx,
    materialFilter.toArray(),
    "pricing_product_materials",
    isPricingProductMaterialRow,
    materialDataAdapter
  );

  const productTypes = await getValuesPool(
    ktx,
    productTypeFilter.toArray(),
    "pricing_product_types",
    isPricingProductTypeRow,
    typeDataAdapter
  );

  const processes = await getValuesPool(
    ktx,
    processFilter.toArray(),
    "pricing_processes",
    isPricingProcessRow,
    processDataAdapter
  );

  const processTimelines = await getProcessTimelinePool(
    ktx,
    processTimelineFilter.toArray()
  );

  const margins = await getValuesPool(
    ktx,
    marginFilter.toArray(),
    "pricing_margins",
    isPricingMarginRow,
    marginDataAdapter
  );

  const unitMaterialMultiples = await getValuesPool(
    ktx,
    unitMaterialMultipleFilter.toArray(),
    "pricing_unit_material_multiples",
    isPricingUnitMaterialRow,
    pricingUnitMaterialMultipleDataAdapter
  );

  return {
    constants,
    careLabels,
    materials,
    unitMaterialMultiples,
    productTypes,
    processes,
    processTimelines,
    margins,
  };
}

interface ValueWithMinimumUnits {
  minimumUnits: number;
}

export function findQuoteItemFromPool<T extends ValueWithMinimumUnits>(
  minimumUnits: number,
  filter: Partial<T>,
  list: T[]
): T {
  for (const item of list) {
    if (item.minimumUnits > minimumUnits) {
      continue;
    }
    if (!isMatch(item, filter)) {
      continue;
    }
    return item;
  }

  throw new Error(
    `Could not find quote value in the pool ${JSON.stringify({
      filter,
      minimumUnits,
    })}`
  );
}

function findTimelineFromPool(
  minimumUnits: number,
  uniqueProcesses: number,
  version: number,
  list: PricingProcessTimeline[]
): PricingProcessTimeline | null {
  for (const item of list) {
    if (
      item.version !== version ||
      item.minimumUnits > minimumUnits ||
      item.uniqueProcesses > uniqueProcesses
    ) {
      continue;
    }
    return item;
  }

  return null;
}

export function getQuoteValuesFromPool(
  costInput: PricingCostInput,
  pool: QuoteValuesPool,
  units: number
): PricingQuoteValues {
  const constant = pool.constants.find(
    (candidate: PricingConstant) =>
      candidate.version === costInput.constantsVersion
  );
  if (!constant) {
    throw new Error(
      `Could not find constant value in the pool for version ${costInput.constantsVersion}`
    );
  }
  const material = findQuoteItemFromPool(
    units,
    {
      version: costInput.productMaterialsVersion,
      category: costInput.materialCategory,
    },
    pool.materials
  );
  const type = findQuoteItemFromPool(
    units,
    {
      version: costInput.productTypeVersion,
      name: costInput.productType,
      complexity: costInput.productComplexity,
    },
    pool.productTypes
  );
  const sample = findQuoteItemFromPool(
    1,
    {
      version: costInput.productTypeVersion,
      name: costInput.productType,
      complexity: costInput.productComplexity,
    },
    pool.productTypes
  );

  const processes: PricingProcess[] = costInput.processes.map(
    (process: Process) =>
      findQuoteItemFromPool(
        units,
        {
          version: costInput.processesVersion,
          ...process,
        },
        pool.processes
      )
  );

  const uniqueProcesses = uniqBy(
    costInput.processes,
    (process: Process): string => process.name
  );

  const processTimeline: PricingProcessTimeline | null = findTimelineFromPool(
    units,
    uniqueProcesses.length,
    costInput.processTimelinesVersion,
    pool.processTimelines
  );

  const margin = findQuoteItemFromPool(
    units,
    { version: costInput.marginVersion },
    pool.margins
  );

  const unitMaterialMultiple = findQuoteItemFromPool(
    units,
    { version: costInput.unitMaterialMultipleVersion },
    pool.unitMaterialMultiples
  );

  const careLabel = findQuoteItemFromPool(
    units,
    { version: costInput.careLabelsVersion },
    pool.careLabels
  );

  const { id: constantId, ...pricingValues } = constant;

  return {
    constantId,
    material,
    unitMaterialMultiple,
    type,
    sample,
    processes,
    processTimeline,
    margin,
    careLabel,

    ...omit(pricingValues, "createdAt", "version"),
  };
}
