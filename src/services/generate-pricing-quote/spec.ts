import uuid from "node-uuid";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as PricingQuotesDAO from "../../dao/pricing-quotes";
import * as DesignEventsDAO from "../../dao/design-events";
import {
  PricingQuoteRequestWithVersions,
  PricingQuoteValues,
} from "../../domain-objects/pricing-quote";
import generatePricingQuote, {
  generateUnsavedQuote,
  generateFromPayloadAndUser,
} from "./index";
import { daysToMs } from "../time-conversion";
import db from "../db";
import Knex from "knex";
import createUser from "../../test-helpers/create-user";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import { PricingCostInputWithoutVersions } from "../../components/pricing-cost-inputs/domain-object";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import ProductDesignsDAO from "../../components/product-designs/dao";

const quoteRequestOne: PricingQuoteRequestWithVersions = {
  designId: null,
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
  units: 100000,
  processTimelinesVersion: 0,
  processesVersion: 0,
  productMaterialsVersion: 0,
  productTypeVersion: 0,
  marginVersion: 0,
  constantsVersion: 0,
  careLabelsVersion: 0,
};

const pricingCostInputs: PricingCostInputWithoutVersions = {
  createdAt: new Date(),
  deletedAt: null,
  designId: "designId",
  expiresAt: null,
  id: "id",
  materialBudgetCents: 1200,
  materialCategory: "BASIC",
  processes: [],
  productComplexity: "SIMPLE",
  productType: "TEESHIRT",
};

test("generateUnsavedQuote failure", async (t: Test) => {
  sandbox().stub(PricingQuotesDAO, "findLatestValuesForRequest").throws();

  try {
    await generateUnsavedQuote(quoteRequestOne);
    t.fail("Should not have succeeded!");
  } catch {
    t.ok("Fails to generate an unsaved quote");
  }
});

test("generatePricingQuote failure", async (t: Test) => {
  sandbox().stub(PricingQuotesDAO, "findLatestValuesForRequest").throws();

  try {
    await generatePricingQuote({
      ...quoteRequestOne,
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
    });
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

  const unsavedQuote = await generateUnsavedQuote(quoteRequestOne);

  t.equal(unsavedQuote.baseCostCents, 386, "calculates base cost correctly");
  t.equal(
    unsavedQuote.processCostCents,
    101,
    "calculates process cost correctly"
  );
  t.equal(
    unsavedQuote.unitCostCents,
    1777,
    "calculates total unit cost correctly"
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

  const unsavedQuote = await generateUnsavedQuote({
    designId: null,
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
    units: 100,
    processTimelinesVersion: 0,
    processesVersion: 0,
    productMaterialsVersion: 0,
    productTypeVersion: 0,
    marginVersion: 0,
    constantsVersion: 0,
    careLabelsVersion: 0,
  });

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

  const unsavedQuote = await generateUnsavedQuote({
    designId: null,
    materialBudgetCents: 1000,
    materialCategory: "BASIC",
    processes: [],
    productComplexity: "BLANK",
    productType: "PACKAGING",
    units: 1,
    processTimelinesVersion: 0,
    processesVersion: 0,
    productMaterialsVersion: 0,
    productTypeVersion: 0,
    marginVersion: 0,
    constantsVersion: 0,
    careLabelsVersion: 0,
  });

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
  await generatePricingValues();
  const designOne = await ProductDesignsDAO.create({
    description: "Generic Shirt",
    productType: "TEESHIRT",
    title: "T-Shirt One",
    userId: user.id,
  });
  const designTwo = await ProductDesignsDAO.create({
    description: "Generic Shirt",
    productType: "TEESHIRT",
    title: "T-Shirt Two",
    userId: user.id,
  });

  const [approvalStepOne, approvalStepTwo] = await db.transaction(
    async (trx: Knex.Transaction) => {
      const { approvalStep: one } = await generateApprovalStep(trx, {
        designId: designOne.id,
      });
      const { approvalStep: two } = await generateApprovalStep(trx, {
        designId: designTwo.id,
      });
      return [one, two];
    }
  );

  const payload = [
    { designId: designOne.id, units: 10 },
    { designId: designTwo.id, units: 20 },
  ];

  await db.transaction(async (trx: Knex.Transaction) => {
    await PricingCostInputsDAO.create(trx, {
      ...pricingCostInputs,
      id: uuid.v4(),
      designId: designOne.id,
    });
    await PricingCostInputsDAO.create(trx, {
      ...pricingCostInputs,
      id: uuid.v4(),
      designId: designTwo.id,
      productComplexity: "BLANK",
    });
    return generateFromPayloadAndUser(payload, user.id, trx);
  });

  const designEventOne = await DesignEventsDAO.findByDesignId(designOne.id);
  const designEventTwo = await DesignEventsDAO.findByDesignId(designTwo.id);

  t.deepEqual(
    designEventOne[0].approvalStepId,
    approvalStepOne.id,
    "Submission is associated with the right step"
  );
  t.deepEqual(
    designEventTwo[0].approvalStepId,
    approvalStepTwo.id,
    "Submission is associated with the right step"
  );
});
