import * as uuid from 'node-uuid';
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
import DataAdapter from '../../services/data-adapter';

export default async function generatePricingQuote(
  request: PricingQuoteRequest
): Promise<PricingQuote> {
  const quoteValues = await findLatestValuesForRequest(request);
  const pricingQuoteInputId = await getQuoteInput(quoteValues);
  const {
    quote,
    processes
  } = calculateQuoteAndProcesses(request, quoteValues, pricingQuoteInputId);
  const createdQuote = await create(quote);

  await createPricingProcesses(processes);

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
    product_material_id: values.material.id,
    product_type_id: values.type.id
  };
  const pricingQuoteInputRow = await findMatchingOrCreateInput(pricingQuoteInput);

  return pricingQuoteInputRow.id;
}

function calculateQuoteAndProcesses(
  request: PricingQuoteRequest,
  values: PricingQuoteValues,
  pricingQuoteInputId: string
): { quote: Uninserted<PricingQuoteRow>, processes: Uninserted<PricingProcessQuoteRow>[] } {
  const { units } = request;
  const adapter = new DataAdapter<PricingQuoteRow, Omit<PricingQuote, 'processes'>>();
  const baseCost = {
    baseCostCents: calculateBaseUnitCost(units, values),
    materialCostCents: Math.max(calculateMaterialCents(values), request.materialBudgetCents || 0),
    processCostCents: calculateProcessCents(units, values)
  };
  const amortizedServicesCents = calculateAmortizedServices(
    units,
    values,
    baseCost.materialCostCents
  );
  const beforeMargin = sum(
    Object
      .values(baseCost)
      .concat([
        amortizedServicesCents
      ])
  );
  const margin = 1 - values.margin.margin / 100;
  const quote: Uninserted<PricingQuoteRow> = adapter
    .forInsertion(Object.assign(
      {
        id: uuid.v4(),
        pricingQuoteInputId
      },
      omit(request, ['processes']),
      baseCost,
      {
        unitCostCents: Math.ceil(beforeMargin / margin)
      }
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
    ? (values.brandedLabelsMinimumUnits - units) * values.brandedLabelsAdditionalCents
    : 0;

  return Math.ceil(sum([
    values.type.unitCents,
    values.brandedLabelsMinimumCents / units,
    brandedLabelAdditionalCents,
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

function calculateAmortizedServices(
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
