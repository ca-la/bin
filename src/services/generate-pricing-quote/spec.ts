import Knex from "knex";
import uuid from "node-uuid";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as PricingQuotesDAO from "../../dao/pricing-quotes";
import DesignEventsDAO from "../../components/design-events/dao";
import { PricingQuoteValues } from "../../domain-objects/pricing-quote";
import generatePricingQuote, {
  generateUnsavedQuote,
  generateFromPayloadAndUser,
} from "./index";
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

const quoteRequestOne: PricingCostInput = {
  createdAt: new Date(),
  deletedAt: null,
  expiresAt: null,
  id: uuid.v4(),
  minimumOrderQuantity: 1,
  designId: "a-design-id",
  materialBudgetCents: 1200,
  materialCategory: "BASIC",
  processes: [
    {
      complexity: "1_COLOR",
      name: "SCREEN_PRINTING",
    },
    {
      complexity: "1_COLOR",
      name: "SCREEN_PRINTING",
    },
  ],
  productComplexity: "SIMPLE",
  productType: "TEESHIRT",
  processTimelinesVersion: 0,
  processesVersion: 0,
  productMaterialsVersion: 0,
  productTypeVersion: 0,
  marginVersion: 0,
  constantsVersion: 0,
  careLabelsVersion: 0,
};

test("generateUnsavedQuote failure", async (t: Test) => {
  sandbox().stub(PricingQuotesDAO, "findLatestValuesForRequest").throws();

  try {
    await generateUnsavedQuote(quoteRequestOne, 100000, 0);
    t.fail("Should not have succeeded!");
  } catch {
    t.ok("Fails to generate an unsaved quote");
  }
});

test("generatePricingQuote failure", async (t: Test) => {
  sandbox().stub(PricingQuotesDAO, "findLatestValuesForRequest").throws();

  try {
    await generatePricingQuote(
      {
        createdAt: new Date(),
        deletedAt: null,
        expiresAt: null,
        id: uuid.v4(),
        minimumOrderQuantity: 1,
        designId: "a-design-id",
        materialBudgetCents: 1200,
        materialCategory: "BASIC",
        processes: [
          {
            complexity: "1_COLOR",
            name: "SCREEN_PRINTING",
          },
          {
            complexity: "1_COLOR",
            name: "SCREEN_PRINTING",
          },
        ],
        productComplexity: "SIMPLE",
        productType: "TEESHIRT",
        processTimelinesVersion: 0,
        processesVersion: 0,
        productMaterialsVersion: 0,
        productTypeVersion: 0,
        marginVersion: 0,
        constantsVersion: 0,
        careLabelsVersion: 0,
      },
      100000
    );
    t.fail("Should not have succeeded!");
  } catch {
    t.ok("Fails to generate an unsaved quote");
  }
});

test("generateUnsavedQuote", async (t: Test) => {
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
        complexity: "1_COLOR",
        createdAt: new Date(),
        id: uuid.v4(),
        minimumUnits: 2000,
        name: "SCREEN_PRINTING",
        displayName: "screen printing",
        setupCents: 3000,
        unitCents: 50,
        version: 0,
      },
      {
        complexity: "1_COLOR",
        createdAt: new Date(),
        id: uuid.v4(),
        minimumUnits: 2000,
        name: "SCREEN_PRINTING",
        displayName: "screen printing",
        setupCents: 3000,
        unitCents: 50,
        version: 0,
      },
    ],
    sample: {
      complexity: "SIMPLE",
      contrast: 0.15,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1,
      name: "TEESHIRT",
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
      complexity: "SIMPLE",
      contrast: 0.15,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1500,
      name: "TEESHIRT",
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
  };

  sandbox()
    .stub(PricingQuotesDAO, "findVersionValuesForRequest")
    .resolves(latestValues);

  const unsavedQuote = await generateUnsavedQuote(
    quoteRequestOne,
    100_000,
    200
  );

  t.equal(unsavedQuote.baseCostCents, 386, "calculates base cost correctly");
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

test("generateUnsavedQuote for blank", async (t: Test) => {
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
        complexity: "1_COLOR",
        createdAt: new Date(),
        id: uuid.v4(),
        minimumUnits: 100,
        name: "SCREEN_PRINTING",
        displayName: "screen printing",
        setupCents: 6000,
        unitCents: 110,
        version: 0,
      },
    ],
    sample: {
      complexity: "BLANK",
      contrast: 0,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1,
      name: "TEESHIRT",
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
      complexity: "BLANK",
      contrast: 0,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 100,
      name: "SHORTS",
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
  };

  sandbox()
    .stub(PricingQuotesDAO, "findVersionValuesForRequest")
    .resolves(latestValues);
  const { user } = await createUser({ withSession: false });
  const design = await generateDesign({ userId: user.id });

  const unsavedQuote = await generateUnsavedQuote(
    {
      createdAt: new Date(),
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: design.id,
      materialBudgetCents: 1100,
      materialCategory: "BASIC",
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
      ],
      productComplexity: "BLANK",
      productType: "TEESHIRT",
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
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

test("generateUnsavedQuote for packaging", async (t: Test) => {
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
      complexity: "BLANK",
      contrast: 0,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1,
      name: "OTHER - PACKAGING",
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
      complexity: "BLANK",
      contrast: 0,
      createdAt: new Date(),
      creationTimeMs: daysToMs(0),
      fulfillmentTimeMs: daysToMs(8),
      id: uuid.v4(),
      minimumUnits: 1,
      name: "PACKAGING",
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
  };

  sandbox()
    .stub(PricingQuotesDAO, "findVersionValuesForRequest")
    .resolves(latestValues);
  const { user } = await createUser({ withSession: false });
  const design = await generateDesign({ userId: user.id });

  const unsavedQuote = await generateUnsavedQuote(
    {
      createdAt: new Date(),
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: design.id,
      materialBudgetCents: 1000,
      materialCategory: "BASIC",
      processes: [],
      productComplexity: "BLANK",
      productType: "PACKAGING",
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
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

test("generateFromPayloadAndUser uses the checkout step", async (t: Test) => {
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
      materialCategory: "BASIC",
      minimumOrderQuantity: 1,
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
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
      materialCategory: "BASIC",
      minimumOrderQuantity: 1,
      processes: [],
      productComplexity: "BLANK",
      productType: "TEESHIRT",
    });
    return generateFromPayloadAndUser(payload, user.id, trx);
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

test("generateFromPayloadAndUser respects MOQ", async (t: Test) => {
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
    await generateFromPayloadAndUser(
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
