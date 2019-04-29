import * as uuid from 'node-uuid';
import * as Knex from 'knex';
import { map, omit } from 'lodash';
import sum from '../sum';
import {
  create,
  createPricingProcesses,
  findLatestValuesForRequest,
  findMatchingOrCreateInput
} from '../../dao/pricing-quotes';
import {
  PricingProcessQuoteRow,
  PricingQuote,
  PricingQuoteRequest,
  PricingQuoteRow,
  PricingQuoteValues
} from '../../domain-objects/pricing-quote';
import PricingProcess from '../../domain-objects/pricing-process';
import * as PricingCostInputsDAO from '../../dao/pricing-cost-inputs';
import * as DesignEventsDAO from '../../dao/design-events';
import PricingCostInputs from '../../domain-objects/pricing-cost-input';
import DataAdapter from '../data-adapter';
import addMargin from '../add-margin';

export type UnsavedQuote = Omit<
  PricingQuote,
  'id' | 'createdAt' | 'pricingQuoteInputId' | 'processes'
>;

export async function generateUnsavedQuote(
  request: PricingQuoteRequest
): Promise<UnsavedQuote> {
  const quoteValues = await findLatestValuesForRequest(request);

  return calculateQuote(request, quoteValues);
}

export default async function generatePricingQuote(
  request: PricingQuoteRequest,
  trx?: Knex.Transaction
): Promise<PricingQuote> {
  const quoteValues = await findLatestValuesForRequest(request);

  const pricingQuoteInputId = await getQuoteInput(quoteValues);
  const {
    quote,
    processes
  } = calculateQuoteAndProcesses(request, quoteValues, pricingQuoteInputId);
  const createdQuote = await create(quote, trx);

  await createPricingProcesses(processes, trx);

  return Object.assign(
    createdQuote,
    { processes: quoteValues.processes }
  );
}

async function getQuoteInput(values: PricingQuoteValues): Promise<string> {
  const pricingQuoteInput = {
    care_label_id: values.careLabel.id,
    constant_id: values.constantId,
    id: uuid.v4(),
    margin_id: values.margin.id,
    pricing_process_timeline_id: values.processTimeline && values.processTimeline.id,
    product_material_id: values.material.id,
    product_type_id: values.type.id
  };
  const pricingQuoteInputRow = await findMatchingOrCreateInput(pricingQuoteInput);

  return pricingQuoteInputRow.id;
}

function calculateQuote(
  request: PricingQuoteRequest,
  values: PricingQuoteValues
): UnsavedQuote {
  const { units } = request;
  const baseCost = {
    baseCostCents: calculateBaseUnitCost(units, values),
    materialCostCents: Math.max(calculateMaterialCents(values), request.materialBudgetCents || 0),
    processCostCents: calculateProcessCents(units, values)
  };
  const {
    creationTimeMs,
    specificationTimeMs,
    sourcingTimeMs,
    samplingTimeMs,
    preProductionTimeMs,
    productionTimeMs,
    fulfillmentTimeMs
  } = values.type;
  const processTimeMs = values.processTimeline ? values.processTimeline.timeMs : 0;
  const developmentCostCents = request.productComplexity !== 'BLANK'
    ? calculateDevelopmentCosts(
      units,
      values,
      baseCost.materialCostCents
    )
    : 0;
  const beforeMargin = sum(
    Object
      .values(baseCost)
      .concat([
        developmentCostCents
      ])
  );
  const unitCostCents = addMargin(beforeMargin, values.margin.margin / 100);

  return {
    ...omit(request, ['processes']),
    ...baseCost,
    creationTimeMs,
    fulfillmentTimeMs,
    preProductionTimeMs,
    processTimeMs,
    productionTimeMs,
    samplingTimeMs,
    sourcingTimeMs,
    specificationTimeMs,
    unitCostCents
  };
}

function calculateQuoteAndProcesses(
  request: PricingQuoteRequest,
  values: PricingQuoteValues,
  pricingQuoteInputId: string
): { quote: Uninserted<PricingQuoteRow>, processes: Uninserted<PricingProcessQuoteRow>[] } {
  const adapter = new DataAdapter<PricingQuoteRow, Omit<PricingQuote, 'processes'>>();
  const quote: Uninserted<PricingQuoteRow> = adapter
    .forInsertion(Object.assign(
      {
        id: uuid.v4(),
        pricingQuoteInputId
      },
      calculateQuote(request, values)
    ));
  const processes: Uninserted<PricingProcessQuoteRow>[] = values.processes.map(
      toPricingProcessQuoteRow.bind(null, quote)
  );

  return { quote, processes };
}

function toPricingProcessQuoteRow(
  quote: Uninserted<PricingQuoteRow>,
  process: PricingProcess
): Uninserted<PricingProcessQuoteRow> {
  return {
    id: uuid.v4(),
    pricing_process_id: process.id,
    pricing_quote_id: quote.id
  };
}

function calculateBaseUnitCost(
  units: number,
  values: PricingQuoteValues
): number {
  const brandedLabelAdditionalCents = units > values.brandedLabelsMinimumUnits
    ? (units - values.brandedLabelsMinimumUnits) * values.brandedLabelsAdditionalCents
    : 0;

  return Math.ceil(sum([
    values.type.unitCents,
    values.brandedLabelsMinimumCents / units,
    brandedLabelAdditionalCents / units,
    values.careLabel.unitCents
  ]));
}

function calculateMaterialCents(
  values: PricingQuoteValues
): number {
  const categoryCents = values.material.unitCents;

  return Math.ceil(sum([
    categoryCents * values.type.yield,
    categoryCents * values.type.contrast
  ]));
}

function calculateProcessCents(
  units: number,
  values: PricingQuoteValues
): number {
  return Math.ceil(sum([
    sum(map(values.processes, (process: PricingProcess): number => process.setupCents / units)),
    sum(map(values.processes, 'unitCents'))
  ]));
}

function calculateDevelopmentCosts(
  units: number,
  values: PricingQuoteValues,
  materialCostCents: number
): number {
  const sampleCents = Math.max(
    values.sampleMinimumCents,
    values.sample.unitCents
  ) + materialCostCents;
  const patternCents = values.type.patternMinimumCents;
  const developmentCents = sum([
    values.workingSessionCents,
    values.technicalDesignCents,
    values.patternRevisionCents,
    values.gradingCents,
    values.markingCents,
    sampleCents,
    patternCents
  ]);

  return Math.ceil(developmentCents / units);
}

export interface CreateQuotePayload {
  designId: string;
  units: number;
}

export async function generateFromPayloadAndUser(
  quotePayloads: CreateQuotePayload[],
  userId: string,
  trx: Knex.Transaction
): Promise<PricingQuote[]> {
  const quotes = [];
  for (const payload of quotePayloads) {
    const { designId, units } = payload;

    const unitsNumber = Number(units);

    const costInputs: PricingCostInputs[] = await PricingCostInputsDAO
      .findByDesignId(designId, trx);

    if (costInputs.length === 0) {
      throw new Error('No costing inputs associated with design ID');
    }

    const quoteRequest: PricingQuoteRequest = {
      ...omit(costInputs[0], ['id', 'createdAt', 'deletedAt']),
      units: unitsNumber
    };

    const quote = await generatePricingQuote(quoteRequest, trx);
    quotes.push(quote);

    await DesignEventsDAO.create({
      actorId: userId,
      bidId: null,
      createdAt: new Date(),
      designId,
      id: uuid.v4(),
      quoteId: quote.id,
      targetId: null,
      type: 'COMMIT_QUOTE'
    }, trx);
  }

  return quotes;
}
