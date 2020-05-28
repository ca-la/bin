import PricingProcess from "../../domain-objects/pricing-process";
import uuid from "node-uuid";
import { map, omit } from "lodash";
import sum from "../sum";
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
  PricingQuoteRequest,
  PricingQuoteRequestWithVersions,
  PricingQuoteRow,
  PricingQuoteValues,
} from "../../domain-objects/pricing-quote";
import { Complexity, ProductType } from "../../domain-objects/pricing";
import Knex from "knex";
import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import DesignEventsDAO from "../../components/design-events/dao";
import PricingCostInputs from "../../components/pricing-cost-inputs/domain-object";
import DataAdapter from "../data-adapter";
import addMargin from "../add-margin";
import ApprovalStepsDAO from "../../components/approval-steps/dao";
import ApprovalStep, {
  ApprovalStepType,
} from "../../components/approval-steps/types";

export type UnsavedQuote = Omit<
  PricingQuote,
  "id" | "createdAt" | "pricingQuoteInputId" | "processes"
>;

export async function generateUnsavedQuote(
  request: PricingQuoteRequestWithVersions
): Promise<UnsavedQuote> {
  const quoteValues = await findVersionValuesForRequest(request);

  return calculateQuote(request, quoteValues);
}

export async function generateUnsavedQuoteWithoutVersions(
  request: PricingQuoteRequest
): Promise<UnsavedQuote> {
  const quoteValues = await findLatestValuesForRequest(request);

  return calculateQuote(request, quoteValues);
}

export default async function generatePricingQuote(
  request: PricingQuoteRequestWithVersions,
  trx?: Knex.Transaction
): Promise<PricingQuote> {
  const quoteValues = await findVersionValuesForRequest(request);

  const pricingQuoteInputId = await getQuoteInput(quoteValues);
  const { quote, processes } = calculateQuoteAndProcesses(
    request,
    quoteValues,
    pricingQuoteInputId
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

  return pricingQuoteInputRow.id;
}

function calculateQuote(
  request: PricingQuoteRequest | PricingQuoteRequestWithVersions,
  values: PricingQuoteValues
): UnsavedQuote {
  const SKIP_DEVELOPMENT_COST_COMPLEXITIES: Complexity[] = ["BLANK"];
  const SKIP_BASE_COST_PRODUCT_TYPES: ProductType[] = ["PACKAGING"];

  const chargeBaseCosts = !SKIP_BASE_COST_PRODUCT_TYPES.includes(
    request.productType
  );
  const chargeDevelopmentCosts = !SKIP_DEVELOPMENT_COST_COMPLEXITIES.includes(
    request.productComplexity
  );

  const { units } = request;

  const baseCostCents = chargeBaseCosts
    ? calculateBaseUnitCost(units, values)
    : 0;

  const baseCost = {
    baseCostCents,
    materialCostCents: Math.max(
      calculateMaterialCents(values),
      request.materialBudgetCents || 0
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
  const filteredRequest = omit(request, [
    "processes",
    "processesVersion",
    "processTimelinesVersion",
    "productTypeVersion",
    "productMaterialsVersion",
    "constantsVersion",
    "careLabelsVersion",
    "marginVersion",
  ]) as Omit<PricingQuoteRequest, "processes">;

  return {
    ...filteredRequest,
    ...baseCost,
    creationTimeMs,
    fulfillmentTimeMs,
    preProductionTimeMs,
    processTimeMs,
    productionTimeMs,
    samplingTimeMs,
    sourcingTimeMs,
    specificationTimeMs,
    unitCostCents,
  };
}

function calculateQuoteAndProcesses(
  request: PricingQuoteRequest,
  values: PricingQuoteValues,
  pricingQuoteInputId: string
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
      calculateQuote(request, values)
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
  for (const payload of quotePayloads) {
    const { designId, units } = payload;

    const unitsNumber = Number(units);

    const steps = await ApprovalStepsDAO.findByDesign(trx, designId);
    const checkoutStep = steps.find(
      (step: ApprovalStep) => step.type === ApprovalStepType.CHECKOUT
    );

    if (!checkoutStep) {
      throw new Error("Could not find checkout step for collection submission");
    }

    const costInputs: PricingCostInputs[] = await PricingCostInputsDAO.findByDesignId(
      {
        designId,
        trx,
      }
    );

    if (costInputs.length === 0) {
      throw new Error("No costing inputs associated with design ID");
    }

    const quoteRequest: PricingQuoteRequestWithVersions = {
      ...omit(costInputs[0], ["id", "createdAt", "deletedAt", "expiresAt"]),
      units: unitsNumber,
    };

    const quote = await generatePricingQuote(quoteRequest, trx);
    quotes.push(quote);

    await DesignEventsDAO.create(trx, {
      actorId: userId,
      approvalStepId: checkoutStep.id,
      approvalSubmissionId: null,
      bidId: null,
      commentId: null,
      createdAt: new Date(),
      designId,
      id: uuid.v4(),
      quoteId: quote.id,
      targetId: null,
      taskTypeId: null,
      type: "COMMIT_QUOTE",
    });
  }

  return quotes;
}
