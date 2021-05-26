import Knex from "knex";
import uuid from "node-uuid";
import { map, sum } from "lodash";

import PricingProcess from "../../domain-objects/pricing-process";
import {
  create,
  createPricingProcesses,
  findLatestValuesForRequest,
  findMatchingOrCreateInput,
  findVersionValuesForRequest,
} from "../../dao/pricing-quotes";
import {
  PricingProcessQuoteRow,
  PricingQuote,
  PricingQuoteRow,
  PricingQuoteValues,
} from "../../domain-objects/pricing-quote";
import { Complexity, ProductType } from "../../domain-objects/pricing";
import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import {
  PricingCostInput,
  UncomittedCostInput,
} from "../../components/pricing-cost-inputs/types";
import DesignEventsDAO from "../../components/design-events/dao";
import DataAdapter from "../data-adapter";
import addMargin, { calculateBasisPoints } from "../add-margin";
import ApprovalStepsDAO from "../../components/approval-steps/dao";
import { ApprovalStepType } from "../../components/approval-steps/types";
import { templateDesignEvent } from "../../components/design-events/types";
import InvalidDataError from "../../errors/invalid-data";
import ResourceNotFoundError from "../../errors/resource-not-found";
import {
  buildQuoteValuesPool,
  getQuoteValuesFromPool,
  QuoteValuesPool,
} from "./quote-values";
import { FINANCING_MARGIN } from "../../config";
import addTimeBuffer from "../add-time-buffer";
import { getDesignProductionFeeBasisPoints } from "../../components/design-quotes/service";

export type UnsavedQuote = Omit<
  PricingQuote,
  "id" | "createdAt" | "pricingQuoteInputId" | "processes"
>;

export async function generateUnsavedQuote(
  costInput: PricingCostInput,
  units: number,
  productionFeeBasisPoints: number
): Promise<UnsavedQuote> {
  const quoteValues = await findVersionValuesForRequest(costInput, units);

  return calculateQuote(
    costInput,
    units,
    quoteValues,
    productionFeeBasisPoints
  );
}

export async function generateUnsavedQuoteWithoutVersions(
  costInput: UncomittedCostInput,
  units: number,
  productionFeeBasisPoints: number
): Promise<UnsavedQuote> {
  const quoteValues = await findLatestValuesForRequest(costInput, units);

  return calculateQuote(
    costInput,
    units,
    quoteValues,
    productionFeeBasisPoints
  );
}

export async function generatePricingQuoteFromPool(
  ktx: Knex,
  costInput: PricingCostInput,
  pool: QuoteValuesPool,
  units: number
): Promise<PricingQuote> {
  const quoteValues = getQuoteValuesFromPool(costInput, pool, units);

  const pricingQuoteInputId = await getQuoteInput(quoteValues);
  const productionFeeBasisPoints = await getDesignProductionFeeBasisPoints(
    costInput.designId
  );
  const { quote, processes } = calculateQuoteAndProcesses(
    costInput,
    units,
    quoteValues,
    pricingQuoteInputId,
    productionFeeBasisPoints
  );
  const createdQuote = await create(quote, ktx);

  await createPricingProcesses(processes, ktx);

  return Object.assign(createdQuote, { processes: quoteValues.processes });
}

export default async function generatePricingQuote(
  costInput: PricingCostInput,
  units: number,
  trx?: Knex.Transaction
): Promise<PricingQuote> {
  const quoteValues = await findVersionValuesForRequest(costInput, units);

  const pricingQuoteInputId = await getQuoteInput(quoteValues);
  const productionFeeBasisPoints = await getDesignProductionFeeBasisPoints(
    costInput.designId
  );
  const { quote, processes } = calculateQuoteAndProcesses(
    costInput,
    units,
    quoteValues,
    pricingQuoteInputId,
    productionFeeBasisPoints
  );
  const createdQuote = await create(quote, trx);

  await createPricingProcesses(processes, trx);

  return Object.assign(createdQuote, { processes: quoteValues.processes });
}

async function getQuoteInput(values: PricingQuoteValues): Promise<string> {
  const pricingQuoteInput = {
    care_label_id: values.careLabel.id,
    constant_id: values.constantId,
    id: uuid.v4(),
    margin_id: values.margin.id,
    pricing_process_timeline_id:
      values.processTimeline && values.processTimeline.id,
    product_material_id: values.material.id,
    product_type_id: values.type.id,
  };
  const pricingQuoteInputRow = await findMatchingOrCreateInput(
    pricingQuoteInput
  );

  if (!pricingQuoteInputRow) {
    throw new ResourceNotFoundError("Could not find or create PricingInput");
  }

  return pricingQuoteInputRow.id;
}

function calculateQuote(
  costInput: UncomittedCostInput,
  units: number,
  values: PricingQuoteValues,
  productionFeeBasisPoints: number
): UnsavedQuote {
  const SKIP_DEVELOPMENT_COST_COMPLEXITIES: Complexity[] = ["BLANK"];
  const SKIP_BASE_COST_PRODUCT_TYPES: ProductType[] = [
    "PACKAGING",
    "OTHER - PACKAGING",
  ];

  const chargeBaseCosts = !SKIP_BASE_COST_PRODUCT_TYPES.includes(
    costInput.productType
  );
  const chargeDevelopmentCosts = !SKIP_DEVELOPMENT_COST_COMPLEXITIES.includes(
    costInput.productComplexity
  );

  const baseCostCents = chargeBaseCosts
    ? calculateBaseUnitCost(units, values)
    : 0;

  const baseCost = {
    baseCostCents,
    materialCostCents: Math.max(
      calculateMaterialCents(values),
      costInput.materialBudgetCents || 0
    ),
    processCostCents: calculateProcessCents(units, values),
  };

  const {
    creationTimeMs,
    specificationTimeMs,
    sourcingTimeMs,
    samplingTimeMs,
    preProductionTimeMs,
    productionTimeMs,
    fulfillmentTimeMs,
  } = values.type;
  const processTimeMs = values.processTimeline
    ? values.processTimeline.timeMs
    : 0;
  const developmentCostCents = chargeDevelopmentCosts
    ? calculateDevelopmentCosts(units, values, baseCost.materialCostCents)
    : 0;
  const beforeMargin = sum(
    Object.values(baseCost).concat([developmentCostCents])
  );
  const unitCostCents = addMargin(beforeMargin, values.margin.margin / 100);
  const totalCents = unitCostCents * units;
  const productionFeeCents = calculateBasisPoints(
    totalCents,
    productionFeeBasisPoints
  );

  return {
    ...baseCost,
    designId: costInput.designId,
    materialBudgetCents: costInput.materialBudgetCents,
    materialCategory: costInput.materialCategory,
    productComplexity: costInput.productComplexity,
    productType: costInput.productType,
    units,
    creationTimeMs,
    fulfillmentTimeMs,
    preProductionTimeMs,
    processTimeMs,
    productionTimeMs,
    samplingTimeMs,
    sourcingTimeMs,
    specificationTimeMs,
    unitCostCents,
    productionFeeCents,
  };
}

function calculateQuoteAndProcesses(
  costInput: PricingCostInput,
  units: number,
  values: PricingQuoteValues,
  pricingQuoteInputId: string,
  productionFeeBasisPoints: number
): {
  quote: Uninserted<PricingQuoteRow>;
  processes: Uninserted<PricingProcessQuoteRow>[];
} {
  const adapter = new DataAdapter<
    PricingQuoteRow,
    Omit<PricingQuote, "processes">
  >();
  const quote: Uninserted<PricingQuoteRow> = adapter.forInsertion(
    Object.assign(
      {
        id: uuid.v4(),
        pricingQuoteInputId,
      },
      calculateQuote(costInput, units, values, productionFeeBasisPoints)
    )
  );
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
    pricing_quote_id: quote.id,
  };
}

function calculateBaseUnitCost(
  units: number,
  values: PricingQuoteValues
): number {
  const brandedLabelAdditionalCents =
    units > values.brandedLabelsMinimumUnits
      ? (units - values.brandedLabelsMinimumUnits) *
        values.brandedLabelsAdditionalCents
      : 0;

  return Math.ceil(
    sum([
      values.type.unitCents,
      values.brandedLabelsMinimumCents / units,
      brandedLabelAdditionalCents / units,
      values.careLabel.unitCents,
      values.technicalDesignCents / units,
    ])
  );
}

function calculateMaterialCents(values: PricingQuoteValues): number {
  const categoryCents = values.material.unitCents;

  return Math.ceil(
    sum([
      categoryCents * values.type.yield,
      categoryCents * values.type.contrast,
    ])
  );
}

function calculateProcessCents(
  units: number,
  values: PricingQuoteValues
): number {
  return Math.ceil(
    sum([
      sum(
        map(
          values.processes,
          (process: PricingProcess): number => process.setupCents / units
        )
      ),
      sum(map(values.processes, "unitCents")),
    ])
  );
}

function calculateDevelopmentCosts(
  units: number,
  values: PricingQuoteValues,
  materialCostCents: number
): number {
  const sampleCents =
    Math.max(values.sampleMinimumCents, values.sample.unitCents) +
    materialCostCents;
  const patternCents = values.type.patternMinimumCents;
  const developmentCents = sum([
    values.workingSessionCents,
    values.patternRevisionCents,
    values.gradingCents,
    values.markingCents,
    sampleCents,
    patternCents,
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
  const designIds = quotePayloads.map((qp: CreateQuotePayload) => qp.designId);
  const costInputsByDesignId = await PricingCostInputsDAO.findLatestForEachDesignId(
    trx,
    designIds
  );
  const pool = await buildQuoteValuesPool(
    trx,
    quotePayloads,
    costInputsByDesignId
  );

  for (const payload of quotePayloads) {
    const { designId, units } = payload;
    const unitsNumber = Number(units);

    const checkoutStep = await ApprovalStepsDAO.findOne(trx, {
      designId,
      type: ApprovalStepType.CHECKOUT,
    });
    if (!checkoutStep) {
      throw new Error("Could not find checkout step for collection submission");
    }

    const latestInput = costInputsByDesignId[designId];
    if (!latestInput) {
      throw new Error(
        `No costing inputs associated with the design #${designId}`
      );
    }

    if (unitsNumber < latestInput.minimumOrderQuantity) {
      throw new InvalidDataError(
        `Payment violates minimum order quantity. Please hit back to update unit quantity for ${designId}`
      );
    }

    const quote = await generatePricingQuoteFromPool(
      trx,
      latestInput,
      pool,
      unitsNumber
    );
    quotes.push(quote);

    await DesignEventsDAO.create(trx, {
      ...templateDesignEvent,
      actorId: userId,
      approvalStepId: checkoutStep.id,
      createdAt: new Date(),
      designId,
      id: uuid.v4(),
      quoteId: quote.id,
      type: "COMMIT_QUOTE",
    });
  }

  return quotes;
}

export function calculateAmounts(
  quote: UnsavedQuote
): {
  payNowTotalCents: number;
  payLaterTotalCents: number;
  timeTotalMs: number;
} {
  const payNowTotalCents = quote.units * quote.unitCostCents;
  const payLaterTotalCents = addMargin(payNowTotalCents, FINANCING_MARGIN);
  const timeTotalMsWithoutBuffer = sum([
    quote.creationTimeMs,
    quote.specificationTimeMs,
    quote.sourcingTimeMs,
    quote.samplingTimeMs,
    quote.preProductionTimeMs,
    quote.processTimeMs,
    quote.productionTimeMs,
    quote.fulfillmentTimeMs,
  ]);
  const timeTotalMs = addTimeBuffer(timeTotalMsWithoutBuffer);
  return { payNowTotalCents, payLaterTotalCents, timeTotalMs };
}
