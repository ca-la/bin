import Knex from "knex";

import * as PricingProductTypesDAO from "../pricing-product-types/dao";
import * as PricingQuotesDAO from "../../dao/pricing-quotes";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import PricingProductType from "../pricing-product-types/domain-object";
import db from "../../services/db";
import {
  Complexity,
  MaterialCategory,
  ProductType,
} from "../../domain-objects/pricing";
import { PricingQuote } from "../../domain-objects/pricing-quote";
import ApprovalStep, {
  ApprovalStepType,
  ApprovalStepState,
} from "../approval-steps/types";
import { getDefaultsByDesign } from "./defaults";
import { sandbox, test, Test } from "../../test-helpers/fresh";

const approvalSteps: ApprovalStep[] = [
  {
    state: ApprovalStepState.UNSTARTED,
    id: "uuid1",
    title: "Checkout",
    ordering: 1,
    designId: "designid",
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  },
  {
    state: ApprovalStepState.UNSTARTED,
    id: "uuid2",
    title: "Technical Design",
    ordering: 2,
    designId: "designid",
    reason: null,
    type: ApprovalStepType.TECHNICAL_DESIGN,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  },
  {
    state: ApprovalStepState.UNSTARTED,
    id: "uuid3",
    title: "Sample",
    ordering: 3,
    designId: "designid",
    reason: null,
    type: ApprovalStepType.SAMPLE,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  },
  {
    state: ApprovalStepState.UNSTARTED,
    id: "uuid4",
    title: "Production",
    ordering: 4,
    designId: "designid",
    reason: null,
    type: ApprovalStepType.PRODUCTION,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  },
];

function createProductType(
  name: ProductType,
  complexity: Complexity
): [PricingProductType, PricingQuote] {
  const productType: PricingProductType = {
    complexity,
    contrast: 0,
    createdAt: new Date(),
    creationTimeMs: 0,
    fulfillmentTimeMs: 0,
    id: "id",
    minimumUnits: 0,
    name,
    patternMinimumCents: 0,
    preProductionTimeMs: 0,
    productionTimeMs: 0,
    samplingTimeMs: 0,
    sourcingTimeMs: 0,
    specificationTimeMs: 0,
    unitCents: 0,
    version: 0,
    yield: 0,
  };

  const pricingQuote: PricingQuote = {
    id: "id",
    pricingQuoteInputId: "id",
    createdAt: new Date(),
    processes: [],
    baseCostCents: 0,
    materialCostCents: 0,
    materialBudgetCents: 0,
    processCostCents: 0,
    unitCostCents: 0,
    productionFeeCents: 0,
    creationTimeMs: 0,
    specificationTimeMs: 0,
    samplingTimeMs: 0,
    preProductionTimeMs: 0,
    sourcingTimeMs: 0,
    processTimeMs: 0,
    productionTimeMs: 0,
    fulfillmentTimeMs: 0,
    productType: ProductType.COAT,
    productComplexity: complexity,
    materialCategory: MaterialCategory.BASIC,
    units: 1,
    designId: "designid",
  };

  return [productType, pricingQuote];
}

test("approvalStepSubmissions defaults creates the right number of submissions for various products", async (t: Test) => {
  let productType: PricingProductType;
  let pricingQuote: PricingQuote;

  sandbox()
    .stub(PricingProductTypesDAO, "findByDesignId")
    .callsFake(() => Promise.resolve(productType));
  sandbox()
    .stub(PricingQuotesDAO, "findByDesignId")
    .callsFake(() => Promise.resolve([pricingQuote]));
  sandbox()
    .stub(ApprovalStepsDAO, "findByDesign")
    .callsFake(() => Promise.resolve(approvalSteps));

  await db.transaction(async (trx: Knex.Transaction) => {
    [productType, pricingQuote] = createProductType(
      ProductType.BACKPACK,
      Complexity.MEDIUM
    );
    const backpackDefaults = await getDefaultsByDesign(trx, "designid");
    t.equal(backpackDefaults.length, 9);

    [productType, pricingQuote] = createProductType(
      ProductType.BACKPACK,
      Complexity.BLANK
    );
    const blankDefaults = await getDefaultsByDesign(trx, "designid");
    t.equal(blankDefaults.length, 4);

    [productType, pricingQuote] = createProductType(
      ProductType["OTHER - NOVELTY LABELS"],
      Complexity.MEDIUM
    );
    const labelDefaults = await getDefaultsByDesign(trx, "designid");
    t.equal(labelDefaults.length, 3);
  });
});
