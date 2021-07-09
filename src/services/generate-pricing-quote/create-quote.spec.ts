import Knex from "knex";
import uuid from "node-uuid";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as PricingQuotesDAO from "../../dao/pricing-quotes";
import DesignEventsDAO from "../../components/design-events/dao";
import { PricingQuoteValues } from "../../domain-objects/pricing-quote";
import { createUnsavedQuote, createQuotes } from "./create-quote";
import { daysToMs } from "../time-conversion";
import db from "../db";
import createUser from "../../test-helpers/create-user";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import ApprovalStepsDAO from "../../components/approval-steps/dao";
import { PricingCostInput } from "../../components/pricing-cost-inputs/types";
import { generateDesign } from "../../test-helpers/factories/product-design";
import { ApprovalStepType } from "../../published-types";
import InvalidDataError from "../../errors/invalid-data";
import * as QuoteValuesService from "../../services/generate-pricing-quote/quote-values";
import createDesign from "../create-design";
import generateCollection from "../../test-helpers/factories/collection";
import { generateTeam } from "../../test-helpers/factories/team";
import {
  Complexity,
  MaterialCategory,
  ProductType,
  ScreenPrintingComplexity,
} from "../../domain-objects/pricing";

const quoteRequestOne: PricingCostInput = {
  createdAt: new Date(),
  deletedAt: null,
  expiresAt: null,
  id: uuid.v4(),
  minimumOrderQuantity: 1,
  designId: "a-design-id",
  materialBudgetCents: 1200,
  materialCategory: MaterialCategory.BASIC,
  processes: [
    {
      complexity: ScreenPrintingComplexity["1_COLOR"],
      name: "SCREEN_PRINT",
    },
    {
      complexity: ScreenPrintingComplexity["1_COLOR"],
      name: "SCREEN_PRINT",
    },
  ],
  productComplexity: Complexity.SIMPLE,
  productType: ProductType.TEESHIRT,
  processTimelinesVersion: 0,
  processesVersion: 0,
  productMaterialsVersion: 0,
  productTypeVersion: 0,
  marginVersion: 0,
  constantsVersion: 0,
  careLabelsVersion: 0,
  unitMaterialMultipleVersion: 0,
};

test("createUnsavedQuote failure", async (t: Test) => {
  sandbox().stub(PricingQuotesDAO, "findLatestValuesForRequest").throws();

  try {
    await createUnsavedQuote(quoteRequestOne, 100000, 0);
    t.fail("Should not have succeeded!");
  } catch {
    t.ok("Fails to generate an unsaved quote");
  }
});

test("createUnsavedQuote", async (t: Test) => {
  const latestValues: PricingQuoteValues = {
    brandedLabelsAdditionalCents: 5,
    brandedLabelsMinimumCents: 255,
    brandedLabelsMinimumUnits: 1000,
    careLabel: {
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 4000,
      unitCents: 5,
      version: 0,
    },
    constantId: uuid.v4(),
    gradingCents: 5000,
    margin: {
      createdAt: new Date(),
      id: uuid.v4(),
      margin: 5,
      minimumUnits: 4500,
      version: 0,
    },
    markingCents: 5000,
    material: {
      category: "BASIC",
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 500,
      unitCents: 200,
      version: 0,
    },
    patternRevisionCents: 5000,
    processTimeline: {
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 2000,
      timeMs: daysToMs(4),
      uniqueProcesses: 1,
      version: 0,
    },
    processes: [
      {
        complexity: ScreenPrintingComplexity["1_COLOR"],
        createdAt: new Date(),
        id: uuid.v4(),
        minimumUnits: 2000,
        name: "SCREEN_PRINT",
        displayName: "screen printing",
        setupCents: 3000,
        unitCents: 50,
        version: 0,
      },
      {
        complexity: ScreenPrintingComplexity["1_COLOR"],
        createdAt: new Date(),
        id: uuid.v4(),
        minimumUnits: 2000,
        name: "SCREEN_PRINT",
        displayName: "screen printing",
        setupCents: 3000,
        unitCents: 50,
        version: 0,
      },
    ],
    sample: {
      complexity: Complexity.SIMPLE,
      contrast: 0.15,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1,
      name: ProductType.TEESHIRT,
      patternMinimumCents: 10000,
      preProductionTimeMs: daysToMs(7),
      productionTimeMs: daysToMs(6),
      samplingTimeMs: daysToMs(5),
      sourcingTimeMs: daysToMs(4),
      specificationTimeMs: daysToMs(3),
      unitCents: 15000,
      version: 0,
      yield: 1.5,
    },
    sampleMinimumCents: 7500,
    technicalDesignCents: 5000,
    type: {
      complexity: Complexity.SIMPLE,
      contrast: 0.15,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1500,
      name: ProductType.TEESHIRT,
      patternMinimumCents: 10000,
      preProductionTimeMs: daysToMs(7),
      productionTimeMs: daysToMs(6),
      samplingTimeMs: daysToMs(5),
      sourcingTimeMs: daysToMs(4),
      specificationTimeMs: daysToMs(3),
      unitCents: 375,
      version: 0,
      yield: 1.5,
    },
    workingSessionCents: 2500,
    unitMaterialMultiple: {
      id: uuid.v4(),
      createdAt: new Date(),
      version: 0,
      minimumUnits: 1,
      multiple: 1,
    },
  };

  sandbox()
    .stub(PricingQuotesDAO, "findVersionValuesForRequest")
    .resolves(latestValues);

  const unsavedQuote = await createUnsavedQuote(quoteRequestOne, 100_000, 200);

  t.equal(unsavedQuote.baseCostCents, 386, "calculates base cost correctly");

  t.equal(
    unsavedQuote.materialCostCents,
    12_00,
    "calculates the materialCostCents correctly"
  );

  t.equal(
    unsavedQuote.processCostCents,
    1_01,
    "calculates process cost correctly"
  );
  t.equal(
    unsavedQuote.unitCostCents,
    17_77,
    "calculates total unit cost correctly"
  );

  t.equal(
    unsavedQuote.productionFeeCents,
    35_540_00,
    "calculates the production fee cents correctly"
  );
});

test("createUnsavedQuote prices are correct with a specific unit material cost multiple", async (t: Test) => {
  const latestValues: PricingQuoteValues = {
    brandedLabelsAdditionalCents: 5,
    brandedLabelsMinimumCents: 255,
    brandedLabelsMinimumUnits: 1000,
    careLabel: {
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 4000,
      unitCents: 5,
      version: 0,
    },
    constantId: uuid.v4(),
    gradingCents: 5000,
    margin: {
      createdAt: new Date(),
      id: uuid.v4(),
      margin: 5,
      minimumUnits: 4500,
      version: 0,
    },
    markingCents: 5000,
    material: {
      category: "BASIC",
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 500,
      unitCents: 200,
      version: 0,
    },
    patternRevisionCents: 5000,
    processTimeline: {
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 2000,
      timeMs: daysToMs(4),
      uniqueProcesses: 1,
      version: 0,
    },
    processes: [
      {
        complexity: ScreenPrintingComplexity["1_COLOR"],
        createdAt: new Date(),
        id: uuid.v4(),
        minimumUnits: 2000,
        name: "SCREEN_PRINT",
        displayName: "screen printing",
        setupCents: 3000,
        unitCents: 50,
        version: 0,
      },
      {
        complexity: ScreenPrintingComplexity["1_COLOR"],
        createdAt: new Date(),
        id: uuid.v4(),
        minimumUnits: 2000,
        name: "SCREEN_PRINT",
        displayName: "screen printing",
        setupCents: 3000,
        unitCents: 50,
        version: 0,
      },
    ],
    sample: {
      complexity: Complexity.SIMPLE,
      contrast: 0.15,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1,
      name: ProductType.TEESHIRT,
      patternMinimumCents: 10000,
      preProductionTimeMs: daysToMs(7),
      productionTimeMs: daysToMs(6),
      samplingTimeMs: daysToMs(5),
      sourcingTimeMs: daysToMs(4),
      specificationTimeMs: daysToMs(3),
      unitCents: 15000,
      version: 0,
      yield: 1.5,
    },
    sampleMinimumCents: 7500,
    technicalDesignCents: 5000,
    type: {
      complexity: Complexity.SIMPLE,
      contrast: 0.15,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1500,
      name: ProductType.TEESHIRT,
      patternMinimumCents: 10000,
      preProductionTimeMs: daysToMs(7),
      productionTimeMs: daysToMs(6),
      samplingTimeMs: daysToMs(5),
      sourcingTimeMs: daysToMs(4),
      specificationTimeMs: daysToMs(3),
      unitCents: 375,
      version: 0,
      yield: 1.5,
    },
    workingSessionCents: 2500,
    unitMaterialMultiple: {
      id: uuid.v4(),
      createdAt: new Date(),
      version: 0,
      minimumUnits: 1,
      multiple: 0.5,
    },
  };

  sandbox()
    .stub(PricingQuotesDAO, "findVersionValuesForRequest")
    .resolves(latestValues);

  const unsavedQuote = await createUnsavedQuote(quoteRequestOne, 100_000, 200);

  t.equal(unsavedQuote.baseCostCents, 386, "calculates base cost correctly");

  t.equal(
    unsavedQuote.materialCostCents,
    12_00 * 0.5,
    "calculates the materialCostCents correctly"
  );

  t.equal(
    unsavedQuote.processCostCents,
    1_01,
    "calculates process cost correctly"
  );
  t.equal(
    unsavedQuote.unitCostCents,
    11_46,
    "calculates total unit cost correctly"
  );

  t.equal(
    unsavedQuote.productionFeeCents,
    22_920_00,
    "calculates the production fee cents correctly"
  );
});

test("createUnsavedQuote for blank", async (t: Test) => {
  const latestValues: PricingQuoteValues = {
    brandedLabelsAdditionalCents: 5,
    brandedLabelsMinimumCents: 25500,
    brandedLabelsMinimumUnits: 1000,
    careLabel: {
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 100,
      unitCents: 5,
      version: 0,
    },
    constantId: uuid.v4(),
    gradingCents: 5000,
    margin: {
      createdAt: new Date(),
      id: uuid.v4(),
      margin: 12.6,
      minimumUnits: 100,
      version: 0,
    },
    markingCents: 5000,
    material: {
      category: "SPECIFY",
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 0,
      unitCents: 0,
      version: 0,
    },
    patternRevisionCents: 5000,
    processTimeline: {
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 100,
      timeMs: daysToMs(2),
      uniqueProcesses: 1,
      version: 0,
    },
    processes: [
      {
        complexity: ScreenPrintingComplexity["1_COLOR"],
        createdAt: new Date(),
        id: uuid.v4(),
        minimumUnits: 100,
        name: "SCREEN_PRINT",
        displayName: "screen printing",
        setupCents: 6000,
        unitCents: 110,
        version: 0,
      },
    ],
    sample: {
      complexity: Complexity.BLANK,
      contrast: 0,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1,
      name: ProductType.TEESHIRT,
      patternMinimumCents: 0,
      preProductionTimeMs: daysToMs(7),
      productionTimeMs: daysToMs(6),
      samplingTimeMs: daysToMs(5),
      sourcingTimeMs: daysToMs(4),
      specificationTimeMs: daysToMs(3),
      unitCents: 0,
      version: 0,
      yield: 1,
    },
    sampleMinimumCents: 0,
    technicalDesignCents: 5000,
    type: {
      complexity: Complexity.BLANK,
      contrast: 0,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 100,
      name: ProductType.SHORTS,
      patternMinimumCents: 0,
      preProductionTimeMs: daysToMs(7),
      productionTimeMs: daysToMs(6),
      samplingTimeMs: daysToMs(5),
      sourcingTimeMs: daysToMs(4),
      specificationTimeMs: daysToMs(3),
      unitCents: 0,
      version: 0,
      yield: 1,
    },
    workingSessionCents: 2500,
    unitMaterialMultiple: {
      id: uuid.v4(),
      createdAt: new Date(),
      version: 0,
      minimumUnits: 1,
      multiple: 0.5, // should not affect the price for Complexity.BLANK" complexiy
    },
  };

  sandbox()
    .stub(PricingQuotesDAO, "findVersionValuesForRequest")
    .resolves(latestValues);
  const { user } = await createUser({ withSession: false });
  const design = await generateDesign({ userId: user.id });

  const unsavedQuote = await createUnsavedQuote(
    {
      createdAt: new Date(),
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: design.id,
      materialBudgetCents: 1100,
      materialCategory: MaterialCategory.BASIC,
      processes: [
        {
          complexity: ScreenPrintingComplexity["1_COLOR"],
          name: "SCREEN_PRINT",
        },
      ],
      productComplexity: Complexity.BLANK,
      productType: ProductType.TEESHIRT,
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
      unitMaterialMultipleVersion: 0,
    },
    100,
    0
  );

  t.equal(unsavedQuote.baseCostCents, 310, "calculates base cost correctly");
  t.equal(
    unsavedQuote.processCostCents,
    170,
    "calculates process cost correctly"
  );
  t.equal(
    unsavedQuote.unitCostCents,
    1808,
    "calculates total unit cost correctly"
  );
});

test("createUnsavedQuote for packaging", async (t: Test) => {
  const latestValues: PricingQuoteValues = {
    brandedLabelsAdditionalCents: 5,
    brandedLabelsMinimumCents: 25500,
    brandedLabelsMinimumUnits: 1000,
    careLabel: {
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 100,
      unitCents: 5,
      version: 0,
    },
    constantId: uuid.v4(),
    gradingCents: 5000,
    margin: {
      createdAt: new Date(),
      id: uuid.v4(),
      margin: 12.6,
      minimumUnits: 100,
      version: 0,
    },
    markingCents: 5000,
    material: {
      category: "SPECIFY",
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 0,
      unitCents: 0,
      version: 0,
    },
    patternRevisionCents: 5000,
    processTimeline: {
      createdAt: new Date(),
      id: uuid.v4(),
      minimumUnits: 100,
      timeMs: daysToMs(2),
      uniqueProcesses: 1,
      version: 0,
    },
    processes: [],
    sample: {
      complexity: Complexity.BLANK,
      contrast: 0,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1,
      name: ProductType["OTHER - PACKAGING"],
      patternMinimumCents: 0,
      preProductionTimeMs: daysToMs(7),
      productionTimeMs: daysToMs(6),
      samplingTimeMs: daysToMs(5),
      sourcingTimeMs: daysToMs(4),
      specificationTimeMs: daysToMs(3),
      unitCents: 0,
      version: 0,
      yield: 1,
    },
    sampleMinimumCents: 0,
    technicalDesignCents: 0,
    type: {
      complexity: Complexity.BLANK,
      contrast: 0,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1,
      name: ProductType.PACKAGING,
      patternMinimumCents: 0,
      preProductionTimeMs: daysToMs(7),
      productionTimeMs: daysToMs(6),
      samplingTimeMs: daysToMs(5),
      sourcingTimeMs: daysToMs(4),
      specificationTimeMs: daysToMs(3),
      unitCents: 0,
      version: 0,
      yield: 1,
    },
    workingSessionCents: 0,
    unitMaterialMultiple: {
      id: uuid.v4(),
      createdAt: new Date(),
      version: 0,
      minimumUnits: 1,
      multiple: 1,
    },
  };

  sandbox()
    .stub(PricingQuotesDAO, "findVersionValuesForRequest")
    .resolves(latestValues);
  const { user } = await createUser({ withSession: false });
  const design = await generateDesign({ userId: user.id });

  const unsavedQuote = await createUnsavedQuote(
    {
      createdAt: new Date(),
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: design.id,
      materialBudgetCents: 1000,
      materialCategory: MaterialCategory.BASIC,
      processes: [],
      productComplexity: Complexity.BLANK,
      productType: ProductType.PACKAGING,
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
      unitMaterialMultipleVersion: 0,
    },
    1,
    0
  );

  t.equal(unsavedQuote.baseCostCents, 0, "calculates base cost correctly");
  t.equal(
    unsavedQuote.processCostCents,
    0,
    "calculates process cost correctly"
  );
  t.equal(
    unsavedQuote.unitCostCents,
    1145,
    "calculates total unit cost correctly"
  );
});

test("createQuote uses the checkout step", async (t: Test) => {
  const { user } = await createUser();
  const { team } = await generateTeam(user.id);
  const { collection } = await generateCollection({ teamId: team.id });
  await generatePricingValues();
  const designOne = await createDesign({
    title: "T-Shirt One",
    userId: user.id,
    collectionIds: [collection.id],
  });
  const designTwo = await createDesign({
    title: "T-Shirt Two",
    userId: user.id,
    collectionIds: [collection.id],
  });

  const payload = [
    { designId: designOne.id, units: 10 },
    { designId: designTwo.id, units: 20 },
  ];

  await db.transaction(async (trx: Knex.Transaction) => {
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: MaterialCategory.BASIC,
      minimumOrderQuantity: 1,
      productComplexity: Complexity.SIMPLE,
      productType: ProductType.TEESHIRT,
      processes: [],
      designId: designOne.id,
    });
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: designTwo.id,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: MaterialCategory.BASIC,
      minimumOrderQuantity: 1,
      processes: [],
      productComplexity: Complexity.BLANK,
      productType: ProductType.TEESHIRT,
    });
    return createQuotes(payload, user.id, trx);
  });

  const [
    designOneEvents,
    designTwoEvents,
  ] = await db.transaction(async (trx: Knex.Transaction) => [
    await DesignEventsDAO.find(trx, { designId: designOne.id }),
    await DesignEventsDAO.find(trx, { designId: designTwo.id }),
  ]);

  await db.transaction(async (trx: Knex.Transaction) => {
    t.deepEqual(
      (await ApprovalStepsDAO.findById(
        trx,
        designOneEvents[0].approvalStepId!
      ))!.type,
      ApprovalStepType.CHECKOUT,
      "Submission is associated with the checkout step"
    );
    t.deepEqual(
      (await ApprovalStepsDAO.findById(
        trx,
        designTwoEvents[0].approvalStepId!
      ))!.type,
      ApprovalStepType.CHECKOUT,
      "Submission is associated with the checkout step"
    );
  });
});

test("createQuote respects MOQ", async (t: Test) => {
  const designId = "a-design-id";
  sandbox().stub(ApprovalStepsDAO, "findOne").resolves({
    id: "a-checkout-step-id",
    type: ApprovalStepType.CHECKOUT,
  });
  sandbox()
    .stub(PricingCostInputsDAO, "findLatestForEachDesignId")
    .resolves({
      [designId]: {
        minimumOrderQuantity: 100,
        processes: [],
      },
    });
  sandbox().stub(QuoteValuesService, "buildQuoteValuesPool").resolves({
    constants: [],
    materials: [],
    productTypes: [],
    processes: [],
    processTimelines: [],
    margins: [],
    careLabels: [],
  });
  const createStub = sandbox().stub(PricingQuotesDAO, "create").resolves({});

  const trx = await db.transaction();

  try {
    await createQuotes(
      [
        {
          designId,
          units: 10,
        },
      ],
      "a-user-id",
      trx
    );
  } catch (error) {
    t.true(error instanceof InvalidDataError, "throws an InvalidDataError");
    t.true(
      /minimum order quantity.*a-design-id/.test(error.message),
      "throws an error with a helpful message"
    );
  } finally {
    await trx.rollback();
  }

  t.deepEqual(createStub.args, [], "does not call quote create");
});
