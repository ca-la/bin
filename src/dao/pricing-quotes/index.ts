import { find, omit, uniqBy } from 'lodash';
import Knex from 'knex';
import db from '../../services/db';
import {
  isEvery,
  validate,
  validateEvery
} from '../../services/validate-from-db';

import { Process } from '../../domain-objects/pricing';
import {
  isPricingQuoteRow,
  PricingProcessQuoteRow,
  PricingQuote,
  PricingQuoteInputRow,
  PricingQuoteRequest,
  PricingQuoteRequestWithVersions,
  PricingQuoteRow,
  PricingQuoteValues
} from '../../domain-objects/pricing-quote';
import PricingConstant, {
  dataAdapter as constantDataAdapter,
  isPricingConstantRow,
  PricingConstantRow
} from '../../domain-objects/pricing-constant';
import PricingProductMaterial, {
  dataAdapter as materialDataAdapter,
  isPricingProductMaterialRow,
  PricingProductMaterialRow
} from '../../domain-objects/pricing-product-material';
import PricingProductType, {
  dataAdapter as typeDataAdapter,
  isPricingProductTypeRow,
  PricingProductTypeRow
} from '../../components/pricing-product-types/domain-object';
import PricingProcess, {
  dataAdapter as processDataAdapter,
  isPricingProcessRow,
  PricingProcessRow
} from '../../domain-objects/pricing-process';
import PricingMargin, {
  dataAdapter as marginDataAdapter,
  isPricingMarginRow,
  PricingMarginRow
} from '../../domain-objects/pricing-margin';
import PricingCareLabel, {
  dataAdapter as careLabelDataAdapter,
  isPricingCareLabelRow,
  PricingCareLabelRow
} from '../../domain-objects/pricing-care-label';
import DataAdapter from '../../services/data-adapter';
import InvalidDataError = require('../../errors/invalid-data');
import first from '../../services/first';
import PricingProcessTimeline, {
  dataAdapter as pricingProcessTimelineDataAdapter,
  isPricingProcessTimelineRow,
  PricingProcessTimelineRow
} from '../../components/pricing-process-timeline/domain-object';

type TableName =
  | 'pricing_care_labels'
  | 'pricing_constants'
  | 'pricing_product_materials'
  | 'pricing_product_types'
  | 'pricing_processes'
  | 'pricing_margins'
  | 'pricing_inputs';

type NormalizedPricingQuote = Omit<PricingQuote, 'processes'>;
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
  designId: row.design_id,
  creationTimeMs: Number(row.creation_time_ms),
  specificationTimeMs: Number(row.specification_time_ms),
  sourcingTimeMs: Number(row.sourcing_time_ms),
  samplingTimeMs: Number(row.sampling_time_ms),
  productionTimeMs: Number(row.production_time_ms),
  processTimeMs: Number(row.process_time_ms),
  fulfillmentTimeMs: Number(row.fulfillment_time_ms)
});

const normalizedPricingQuoteAdapter = new DataAdapter<
  PricingQuoteRow,
  NormalizedPricingQuote
>(encodeNormalizedPricingQuote);

export async function create(
  quote: Uninserted<PricingQuoteRow>,
  trx?: Knex.Transaction
): Promise<NormalizedPricingQuote> {
  const TABLE_NAME = 'pricing_quotes';
  const [created]: [object | null] = await db(TABLE_NAME)
    .insert(omit(quote, ['processes']))
    .returning('*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  if (created && isPricingQuoteRow(created)) {
    return normalizedPricingQuoteAdapter.parse(created);
  }

  throw new Error('There was a problem saving the pricing quote');
}

export async function findMatchingOrCreateInput(
  input: Uninserted<PricingQuoteInputRow>
): Promise<PricingQuoteInputRow> {
  const TABLE_NAME = 'pricing_inputs';
  const maybeMatch: PricingQuoteInputRow | null = await db(TABLE_NAME)
    .first()
    .where(omit(input, ['id']));

  if (maybeMatch) {
    return maybeMatch;
  }

  const [created]: [PricingQuoteInputRow] = await db(TABLE_NAME)
    .insert(input)
    .returning('*');

  return created;
}

export async function findVersionValuesForRequest(
  request: PricingQuoteRequestWithVersions
): Promise<PricingQuoteValues> {
  // tslint:disable-next-line: no-console
  console.log(
    'findVersionValuesFromRequest:',
    JSON.stringify(request, null, 2)
  );

  const { units } = request;
  const constant = await findConstants(request.constantsVersion);
  const careLabel = await findCareLabel(units, request.careLabelsVersion);
  const material = await findProductMaterial(
    request.materialCategory,
    units,
    request.productMaterialsVersion
  );
  const type = await findProductType(
    request.productType,
    request.productComplexity,
    units,
    request.productTypeVersion
  );
  const sample = await findProductType(
    request.productType,
    request.productComplexity,
    1,
    request.productTypeVersion
  );

  const processes = await findProcesses(
    request.processes,
    units,
    request.processesVersion
  );
  const processTimeline = await findProcessTimeline(
    request.processes,
    units,
    request.processTimelinesVersion
  );
  const margin = await findMargin(request.units, request.marginVersion);

  const { id: constantId, ...pricingValues } = constant;

  return {
    careLabel,
    constantId,
    margin,
    material,
    processTimeline,
    processes,
    sample,
    type,
    ...omit(pricingValues, 'createdAt', 'version')
  };
}

export async function findLatestValuesForRequest(
  request: PricingQuoteRequest
): Promise<PricingQuoteValues> {
  const { units } = request;
  const latestConstant = await findConstants();
  const careLabel = await findCareLabel(units);
  const material = await findProductMaterial(request.materialCategory, units);
  const type = await findProductType(
    request.productType,
    request.productComplexity,
    units
  );
  const sample = await findProductType(
    request.productType,
    request.productComplexity,
    1
  );
  const processes = await findProcesses(request.processes, units);
  const processTimeline = await findProcessTimeline(request.processes, units);
  const margin = await findMargin(request.units);

  const { id: constantId, ...pricingValues } = latestConstant;

  return {
    careLabel,
    constantId,
    margin,
    material,
    processTimeline,
    processes,
    sample,
    type,
    ...omit(pricingValues, 'createdAt', 'version')
  };
}

export async function createPricingProcesses(
  processRows: Uninserted<PricingProcessQuoteRow>[],
  trx?: Knex.Transaction
): Promise<PricingProcess[]> {
  const TABLE_NAME = 'pricing_quote_processes';
  return Promise.all(
    processRows.map(
      async (
        processRow: Uninserted<PricingProcessQuoteRow>
      ): Promise<PricingProcess> =>
        db(TABLE_NAME)
          .insert(processRow)
          .modify((query: Knex.QueryBuilder) => {
            if (trx) {
              query.transacting(trx);
            }
          })
    )
  );
}

async function attachProcesses(
  quoteRow: PricingQuoteRow
): Promise<PricingQuote> {
  const processes: object[] = await db('pricing_quote_processes')
    .select('pricing_processes.*')
    .leftJoin(
      'pricing_processes',
      'pricing_quote_processes.pricing_process_id',
      'pricing_processes.id'
    )
    .where({ 'pricing_quote_processes.pricing_quote_id': quoteRow.id });

  return Object.assign(
    {
      processes: isEvery(isPricingProcessRow, processes)
        ? processes.map((p: PricingProcessRow) => processDataAdapter.parse(p))
        : []
    },
    normalizedPricingQuoteAdapter.parse(quoteRow)
  );
}

export async function findById(id: string): Promise<PricingQuote | null> {
  const TABLE_NAME = 'pricing_quotes';
  const quote: object | null = await db(TABLE_NAME)
    .first()
    .where({ id });

  if (!quote || !isPricingQuoteRow(quote)) {
    return null;
  }

  return attachProcesses(quote);
}

export async function findByDesignId(
  designId: string
): Promise<PricingQuote[] | null> {
  const TABLE_NAME = 'pricing_quotes';
  const quotes: object[] = await db(TABLE_NAME).where({ design_id: designId });

  if (!quotes.every(isPricingQuoteRow)) {
    return null;
  }

  return Promise.all((quotes as PricingQuoteRow[]).map(attachProcesses));
}

export async function findByDesignIds(
  designIds: string[]
): Promise<PricingQuote[] | null> {
  const TABLE_NAME = 'pricing_quotes';
  const quotes: object[] = await db(TABLE_NAME).whereIn('design_id', designIds);

  if (!quotes.every(isPricingQuoteRow)) {
    return null;
  }

  return Promise.all((quotes as PricingQuoteRow[]).map(attachProcesses));
}

async function findCareLabel(
  units: number,
  version?: number
): Promise<PricingCareLabel> {
  const TABLE_NAME = 'pricing_care_labels';
  const careLabelRow: PricingCareLabelRow | null = await findAtVersionOrLatest<
    Promise<PricingCareLabelRow | null>
  >(TABLE_NAME, units, version);

  if (!careLabelRow) {
    throw new InvalidDataError('Pricing care label does not exist!');
  }

  return validate(
    TABLE_NAME,
    isPricingCareLabelRow,
    careLabelDataAdapter,
    careLabelRow
  );
}

async function findConstants(version?: number): Promise<PricingConstant> {
  const TABLE_NAME = 'pricing_constants';
  const constantRow: PricingConstantRow | null = await db(TABLE_NAME)
    .first()
    .modify((query: Knex.QueryBuilder) => {
      if (version) {
        query.where({ version });
      }
    })
    .orderBy('created_at', 'desc');

  if (!constantRow) {
    throw new Error('Pricing constant could not be found!');
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
  const TABLE_NAME = 'pricing_product_materials';
  const materialRow: PricingProductMaterialRow | null = await findAtVersionOrLatest<
    Knex.QueryBuilder
  >(TABLE_NAME, units, version).where({ category });

  if (!materialRow) {
    throw new Error('Pricing product material could not be found!');
  }

  return validate(
    TABLE_NAME,
    isPricingProductMaterialRow,
    materialDataAdapter,
    materialRow
  );
}

async function findProductType(
  name: string,
  complexity: string,
  units: number,
  version?: number
): Promise<PricingProductType> {
  const TABLE_NAME = 'pricing_product_types';
  const typeRow: PricingProductTypeRow | null = await findAtVersionOrLatest<
    Knex.QueryBuilder
  >(TABLE_NAME, units, version).where({ name, complexity });

  if (!typeRow) {
    throw new Error('Pricing product type could not be found!');
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
  const TABLE_NAME = 'pricing_processes';
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
          modifyQuery.whereIn('version', db(TABLE_NAME).max('version'));
        }
      })
      .whereIn(
        'minimum_units',
        db(TABLE_NAME)
          .where('minimum_units', '<=', units)
          .andWhere(process)
          .modify((modifyQuery: Knex.QueryBuilder) => {
            if (version) {
              modifyQuery.where({ version });
            } else {
              modifyQuery.whereIn('version', db(TABLE_NAME).max('version'));
            }
          })
          .max('minimum_units')
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
    throw new Error(`Could not find all processes:
Requested processes: ${JSON.stringify(processes, null, 4)}
Found processes: ${JSON.stringify(processRows, null, 4)}`);
  }

  return validateEvery(
    'pricing_processes',
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
  const TABLE_NAME = 'pricing_process_timelines';
  const uniqueProcesses = uniqBy(
    processes,
    (process: Process): string => process.name
  ).length;

  const processTimelineRow = await db(TABLE_NAME)
    .select()
    .where('unique_processes', '<=', uniqueProcesses)
    .modify((modifyQuery: Knex.QueryBuilder) => {
      if (version) {
        modifyQuery.where({ version });
      } else {
        modifyQuery.whereIn('version', db(TABLE_NAME).max('version'));
      }
    })
    .whereIn(
      'unique_processes',
      db(TABLE_NAME)
        .where('unique_processes', '<=', uniqueProcesses)
        .max('unique_processes')
        .modify((modifyQuery: Knex.QueryBuilder) => {
          if (version) {
            modifyQuery.where({ version });
          } else {
            modifyQuery.whereIn('version', db(TABLE_NAME).max('version'));
          }
        })
    )
    .whereIn(
      'minimum_units',
      db(TABLE_NAME)
        .where('minimum_units', '<=', units)
        .max('minimum_units')
        .modify((modifyQuery: Knex.QueryBuilder) => {
          if (version) {
            modifyQuery.where({ version });
          } else {
            modifyQuery.whereIn('version', db(TABLE_NAME).max('version'));
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
  const TABLE_NAME = 'pricing_margins';
  const marginRow: PricingMarginRow | null = await findAtVersionOrLatest<
    Promise<PricingMarginRow | null>
  >(TABLE_NAME, units, version);

  if (!marginRow) {
    throw new Error('Pricing margin does not exist!');
  }

  return validate(TABLE_NAME, isPricingMarginRow, marginDataAdapter, marginRow);
}

function findAtVersionOrLatest<T>(
  from: TableName,
  units: number,
  version?: number
): T {
  return db(from)
    .first()
    .modify((modifyQuery: Knex.QueryBuilder) => {
      if (version) {
        modifyQuery.where({ version });
      } else {
        modifyQuery.whereIn('version', db(from).max('version'));
      }
    })
    .andWhere('minimum_units', '<=', units)
    .orderBy('minimum_units', 'desc');
}
