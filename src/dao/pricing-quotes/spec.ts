import tape from "tape";
import uuid from "node-uuid";
import { omit } from "lodash";

import { test } from "../../test-helpers/fresh";
import * as PricingQuotesDAO from "./index";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import {
  Complexity,
  MaterialCategory,
  ProductType,
  ScreenPrintingComplexity,
} from "../../domain-objects/pricing";
import createUser from "../../test-helpers/create-user";
import { generateDesign } from "../../test-helpers/factories/product-design";

test("PricingQuotes DAO with no data", async (t: tape.Test) => {
  try {
    await PricingQuotesDAO.findLatestValuesForRequest(
      {
        designId: "a-design-id",
        materialCategory: MaterialCategory.SPECIFY,
        processes: [],
        productComplexity: Complexity.COMPLEX,
        productType: ProductType.BLAZER,
        materialBudgetCents: 0,
        minimumOrderQuantity: 1,
      },
      1000
    );
    t.fail("Should not have succeeded");
  } catch {
    t.ok("Finding latest values fails");
  }
});

test("PricingQuotes DAO supports finding the latest values", async (t: tape.Test) => {
  // generate a bunch of values in the test db.
  await generatePricingValues();
  const { user } = await createUser({ withSession: false });
  const design = await generateDesign({ userId: user.id });

  // product type failure

  try {
    await PricingQuotesDAO.findLatestValuesForRequest(
      {
        minimumOrderQuantity: 1,
        designId: design.id,
        materialCategory: MaterialCategory.BASIC,
        processes: [],
        productComplexity: Complexity.SIMPLE,
        productType: "LONG_JOHNS" as ProductType,
        materialBudgetCents: 0,
      },
      1000
    );
  } catch (error) {
    t.equal(error.message, "Pricing product type could not be found!");
  }

  // complexity failure

  try {
    await PricingQuotesDAO.findLatestValuesForRequest(
      {
        minimumOrderQuantity: 1,
        designId: design.id,
        materialCategory: MaterialCategory.BASIC,
        processes: [],
        productComplexity: "SIMPLE FOO" as Complexity,
        productType: ProductType.TEESHIRT,
        materialBudgetCents: 0,
      },
      1000
    );
  } catch (error) {
    t.equal(error.message, "Pricing product type could not be found!");
  }

  // material failure

  try {
    await PricingQuotesDAO.findLatestValuesForRequest(
      {
        minimumOrderQuantity: 1,
        designId: design.id,
        materialCategory: "BASIC FOO" as MaterialCategory,
        processes: [],
        productComplexity: Complexity.SIMPLE,
        productType: ProductType.TEESHIRT,
        materialBudgetCents: 0,
      },
      1000
    );
  } catch (error) {
    t.equal(error.message, "Pricing product material could not be found!");
  }

  // success

  const latestValueRequest = await PricingQuotesDAO.findLatestValuesForRequest(
    {
      minimumOrderQuantity: 1,
      designId: design.id,
      materialCategory: MaterialCategory.BASIC,
      processes: [],
      productComplexity: Complexity.SIMPLE,
      productType: ProductType.TEESHIRT,
      materialBudgetCents: 0,
    },
    1000
  );

  t.deepEqual(
    omit(
      {
        ...latestValueRequest,
        careLabel: {
          ...omit(latestValueRequest.careLabel, "createdAt", "id"),
        },
        margin: {
          ...omit(latestValueRequest.margin, "createdAt", "id"),
        },
        material: {
          ...omit(latestValueRequest.material, "createdAt", "id"),
        },
        unitMaterialMultiple: {
          ...omit(latestValueRequest.unitMaterialMultiple, "createdAt", "id"),
        },
        sample: {
          ...omit(latestValueRequest.sample, "createdAt", "id"),
        },
        type: {
          ...omit(latestValueRequest.type, "createdAt", "id"),
        },
      },
      "constantId"
    ),
    {
      brandedLabelsAdditionalCents: 5,
      brandedLabelsMinimumCents: 25500,
      brandedLabelsMinimumUnits: 1000,
      careLabel: {
        minimumUnits: 1000,
        unitCents: 12,
        version: 0,
      },
      gradingCents: 5000,
      margin: {
        margin: "8",
        minimumUnits: 1000,
        version: 0,
      },
      markingCents: 5000,
      material: {
        category: "BASIC",
        minimumUnits: 500,
        unitCents: 400,
        version: 0,
      },
      unitMaterialMultiple: {
        version: 1,
        minimumUnits: 1000,
        multiple: 0.95,
      },
      patternRevisionCents: 5000,
      processTimeline: null,
      processes: [],
      sample: {
        complexity: "SIMPLE",
        contrast: "0.15",
        creationTimeMs: 0,
        fulfillmentTimeMs: 259200000,
        minimumUnits: 1,
        name: "TEESHIRT",
        patternMinimumCents: 10000,
        preProductionTimeMs: 129600000,
        productionTimeMs: 21600000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
        unitCents: 15000,
        version: 0,
        yield: "1.5",
      },
      sampleMinimumCents: 7500,
      technicalDesignCents: 5000,
      type: {
        complexity: "SIMPLE",
        contrast: "0.15",
        creationTimeMs: 0,
        fulfillmentTimeMs: 259200000,
        minimumUnits: 750,
        name: "TEESHIRT",
        patternMinimumCents: 10000,
        preProductionTimeMs: 129600000,
        productionTimeMs: 270000000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
        unitCents: 750,
        version: 0,
        yield: "1.5",
      },
      workingSessionCents: 2500,
    },
    "Returns the latest values for a request"
  );

  // success with processes

  const latestValueRequestWithProcesses = await PricingQuotesDAO.findLatestValuesForRequest(
    {
      designId: design.id,
      materialCategory: MaterialCategory.BASIC,
      processes: [
        {
          complexity: ScreenPrintingComplexity["2_COLORS"],
          name: "SCREEN_PRINT",
        },
      ],
      productComplexity: Complexity.SIMPLE,
      productType: ProductType.TEESHIRT,
      materialBudgetCents: 0,
      minimumOrderQuantity: 1,
    },
    1000
  );

  t.deepEqual(
    omit(
      {
        ...latestValueRequestWithProcesses,
        careLabel: {
          ...omit(latestValueRequestWithProcesses.careLabel, "createdAt", "id"),
        },
        margin: {
          ...omit(latestValueRequestWithProcesses.margin, "createdAt", "id"),
        },
        material: {
          ...omit(latestValueRequestWithProcesses.material, "createdAt", "id"),
        },
        unitMaterialMultiple: {
          ...omit(
            latestValueRequestWithProcesses.unitMaterialMultiple,
            "createdAt",
            "id"
          ),
        },
        processTimeline: {
          ...omit(
            latestValueRequestWithProcesses.processTimeline,
            "createdAt",
            "id"
          ),
        },
        processes: [
          {
            ...omit(
              latestValueRequestWithProcesses.processes[0],
              "createdAt",
              "id"
            ),
          },
        ],
        sample: {
          ...omit(latestValueRequestWithProcesses.sample, "createdAt", "id"),
        },
        type: {
          ...omit(latestValueRequestWithProcesses.type, "createdAt", "id"),
        },
      },
      "constantId"
    ),
    {
      brandedLabelsAdditionalCents: 5,
      brandedLabelsMinimumCents: 25500,
      brandedLabelsMinimumUnits: 1000,
      careLabel: {
        minimumUnits: 1000,
        unitCents: 12,
        version: 0,
      },
      gradingCents: 5000,
      margin: {
        margin: "8",
        minimumUnits: 1000,
        version: 0,
      },
      markingCents: 5000,
      material: {
        category: "BASIC",
        minimumUnits: 500,
        unitCents: 400,
        version: 0,
      },
      unitMaterialMultiple: {
        version: 1,
        minimumUnits: 1000,
        multiple: 0.95,
      },
      patternRevisionCents: 5000,
      processTimeline: {
        minimumUnits: 50,
        timeMs: 86400000,
        uniqueProcesses: 1,
        version: 0,
      },
      processes: [
        {
          complexity: ScreenPrintingComplexity["2_COLORS"],
          minimumUnits: 1000,
          name: "SCREEN_PRINT",
          displayName: "screen printing",
          setupCents: 6000,
          unitCents: 105,
          version: 0,
        },
      ],
      sample: {
        complexity: "SIMPLE",
        contrast: "0.15",
        creationTimeMs: 0,
        fulfillmentTimeMs: 259200000,
        minimumUnits: 1,
        name: "TEESHIRT",
        patternMinimumCents: 10000,
        preProductionTimeMs: 129600000,
        productionTimeMs: 21600000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
        unitCents: 15000,
        version: 0,
        yield: "1.5",
      },
      sampleMinimumCents: 7500,
      technicalDesignCents: 5000,
      type: {
        complexity: "SIMPLE",
        contrast: "0.15",
        creationTimeMs: 0,
        fulfillmentTimeMs: 259200000,
        minimumUnits: 750,
        name: "TEESHIRT",
        patternMinimumCents: 10000,
        preProductionTimeMs: 129600000,
        productionTimeMs: 270000000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
        unitCents: 750,
        version: 0,
        yield: "1.5",
      },
      workingSessionCents: 2500,
    },
    "Returns the latest values for a request"
  );
});

test("PricingQuotes DAO supports finding the specific 0 version of unitMaterialMultiple", async (t: tape.Test) => {
  await generatePricingValues();
  const { user } = await createUser({ withSession: false });
  const design = await generateDesign({ userId: user.id });
  const valueRequest = await PricingQuotesDAO.findVersionValuesForRequest(
    {
      id: uuid.v4(),
      createdAt: new Date(),
      deletedAt: null,
      expiresAt: null,
      designId: design.id,
      materialCategory: MaterialCategory.BASIC,
      processes: [
        {
          complexity: ScreenPrintingComplexity["2_COLORS"],
          name: "SCREEN_PRINT",
        },
      ],
      productComplexity: Complexity.SIMPLE,
      productType: ProductType.TEESHIRT,
      materialBudgetCents: 0,
      minimumOrderQuantity: 1,
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
      unitMaterialMultipleVersion: 0,
    },
    4000
  );

  t.deepEqual(
    omit(valueRequest.unitMaterialMultiple, "createdAt", "id"),
    {
      version: 0,
      minimumUnits: 3000,
      multiple: 0.95,
    },
    "Returns the specified version of unitMaterialMultiple"
  );
});
