import { find, omit, uniqBy } from 'lodash';
import * as Knex from 'knex';
import * as db from '../../services/db';
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
} from '../../domain-objects/pricing-product-type';
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

type TableName = 'pricing_care_labels'
  | 'pricing_constants'
  | 'pricing_product_materials'
  | 'pricing_product_types'
  | 'pricing_processes'
  | 'pricing_margins'
  | 'pricing_inputs';

type NormalizedPricingQuote = Omit<PricingQuote, 'processes'>;
const normalizedPricingQuoteAdapter =
  new DataAdapter<PricingQuoteRow, NormalizedPricingQuote>();

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

export async function findLatestValuesForRequest(
  request: PricingQuoteRequest
): Promise<PricingQuoteValues> {
  const { units } = request;
  const latestConstant = await findLatestConstants();
  const careLabel = await findLatestCareLabel(units);
  const material = await findLatestProductMaterial(request.materialCategory, units);
  const type = await findLatestProductType(request.productType, request.productComplexity, units);
  const sample = await findLatestProductType(request.productType, request.productComplexity, 1);
  const processes = await findLatestProcesses(request.processes, units);
  const margin = await findLatestMargin(request.units);

  const { id: constantId, ...pricingValues } = latestConstant;

  return {
    careLabel,
    constantId,
    margin,
    material,
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
      async (processRow: Uninserted<PricingProcessQuoteRow>): Promise<PricingProcess> =>
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

async function attachProcesses(quoteRow: PricingQuoteRow): Promise<PricingQuote> {
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

export async function findByDesignId(designId: string): Promise<PricingQuote[] | null> {
  const TABLE_NAME = 'pricing_quotes';
  const quotes: object[] = await db(TABLE_NAME)
    .where({ design_id: designId });

  if (!quotes.every(isPricingQuoteRow)) {
    return null;
  }

  return Promise.all((quotes as PricingQuoteRow[]).map(attachProcesses));
}

async function findLatestCareLabel(units: number): Promise<PricingCareLabel> {
  const TABLE_NAME = 'pricing_care_labels';
  const careLabelRow: PricingCareLabelRow | null =
    await findLatest<Promise<PricingCareLabelRow | null>>(TABLE_NAME, units);

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

async function findLatestConstants(): Promise<PricingConstant> {
  const TABLE_NAME = 'pricing_constants';
  const constantRow: PricingConstantRow | null = await db(TABLE_NAME)
    .first()
    .orderBy('created_at', 'desc');

  if (!constantRow) {
    throw new InvalidDataError('Latest pricing constant could not be found!');
  }

  return validate(
    TABLE_NAME,
    isPricingConstantRow,
    constantDataAdapter,
    constantRow
  );
}

async function findLatestProductMaterial(
  category: string,
  units: number
): Promise<PricingProductMaterial> {
  const TABLE_NAME = 'pricing_product_materials';
  const materialRow: PricingProductMaterialRow | null =
    await findLatest<Knex.QueryBuilder>(TABLE_NAME, units).where({ category });

  if (!materialRow) {
    throw new InvalidDataError('Latest pricing product material could not be found!');
  }

  return validate(
    TABLE_NAME,
    isPricingProductMaterialRow,
    materialDataAdapter,
    materialRow
  );
}

async function findLatestProductType(
  name: string,
  complexity: string,
  units: number
): Promise<PricingProductType> {
  const TABLE_NAME = 'pricing_product_types';
  const typeRow: PricingProductTypeRow | null =
    await findLatest<Knex.QueryBuilder>(TABLE_NAME, units).where({ name, complexity });

  if (!typeRow) {
    throw new InvalidDataError('Latest pricing product type could not be found!');
  }

  return validate(
    TABLE_NAME,
    isPricingProductTypeRow,
    typeDataAdapter,
    typeRow
  );
}

async function findLatestProcesses(
  processes: Process[],
  units: number
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
      .whereIn(
        'version',
        db(TABLE_NAME)
          .max('version')
      )
      .whereIn(
        'minimum_units',
        db(TABLE_NAME)
          .where('minimum_units', '<=', units)
          .andWhere(process)
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
    processes.map((process: Process): PricingProcessRow => {
      // lodash thinks process is a function since it has a name property
      return find(processRows, process as object);
    })
  );
}

async function findLatestMargin(units: number): Promise<PricingMargin> {
  const TABLE_NAME = 'pricing_margins';
  const marginRow: PricingMarginRow | null =
    await findLatest<Promise<PricingMarginRow | null>>(TABLE_NAME, units);

  if (!marginRow) {
    throw new InvalidDataError('Pricing margin does not exist!');
  }

  return validate(
    TABLE_NAME,
    isPricingMarginRow,
    marginDataAdapter,
    marginRow
  );
}

function findLatest<T>(from: TableName, units: number): T {
  return db(from)
    .first()
    .whereIn('version', db(from).max('version'))
    .andWhere('minimum_units', '<=', units)
    .orderBy('minimum_units', 'desc');
}
