import { sum, map } from "lodash";

import { UncomittedCostInput } from "../../components/pricing-cost-inputs/types";
import { Complexity, ProductType } from "../../domain-objects/pricing";
import PricingProcess from "../../domain-objects/pricing-process";
import { PricingQuoteValues } from "../../domain-objects/pricing-quote";
import addMargin from "../add-margin";
import { basisPointToPercentage } from "../basis-point-to-percentage";
import { UnsavedQuote } from "./types";

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

export function calculateQuote(
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

  const baseMaterialCostCents = Math.max(
    calculateMaterialCents(values),
    costInput.materialBudgetCents || 0
  );

  const materialCostCentsWithMultiple =
    baseMaterialCostCents * values.unitMaterialMultiple.multiple;
  const baseCost = {
    baseCostCents,
    materialCostCents: materialCostCentsWithMultiple,
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
  const productionFeeCents = Math.round(
    totalCents * basisPointToPercentage(productionFeeBasisPoints)
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
