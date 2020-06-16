import tape from "tape";
import uuid from "node-uuid";

import * as Service from "./service";
import { test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { create as createDesign } from "../product-designs/dao";
import { PricingQuote } from "../../domain-objects/pricing-quote";
import { checkout } from "../../test-helpers/checkout-collection";

test("findByUserId finds timelines by user id with task breakdowns", async (t: tape.Test) => {
  const {
    user: { designer },
    collectionDesigns,
  } = await checkout();
  const timeline = await Service.findAllByUserId(designer.user.id);
  t.deepEqual(
    timeline,
    [
      {
        ...timeline[0],
        designId: collectionDesigns[0].id,
        bufferTimeMs: 190588235,
        preProductionTimeMs: 129600000,
        productionTimeMs: 561600000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
      },
      {
        ...timeline[1],
        designId: collectionDesigns[1].id,
        bufferTimeMs: 109016471,
        preProductionTimeMs: 77760000,
        productionTimeMs: 462240000,
        samplingTimeMs: 0,
        sourcingTimeMs: 0,
        specificationTimeMs: 77760000,
      },
    ],
    "returns expected timeline values"
  );
});

test("findByCollectionId finds timelines by collection id and completed stage", async (t: tape.Test) => {
  const { collection, collectionDesigns } = await checkout();
  const timeline = await Service.findAllByCollectionId(collection.id);
  t.deepEqual(
    timeline,
    [
      {
        ...timeline[0],
        designId: collectionDesigns[0].id,
        bufferTimeMs: 190588235,
        preProductionTimeMs: 129600000,
        productionTimeMs: 561600000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
      },
      {
        ...timeline[1],
        designId: collectionDesigns[1].id,
        bufferTimeMs: 109016471,
        preProductionTimeMs: 77760000,
        productionTimeMs: 462240000,
        samplingTimeMs: 0,
        sourcingTimeMs: 0,
        specificationTimeMs: 77760000,
      },
    ],
    "returns expected timeline values"
  );
});

test("format timelines only returns valid timelines", async (t: tape.Test) => {
  const { user } = await createUser();
  const validDesign = await createDesign({
    productType: "A product type",
    title: "A newer design",
    userId: user.id,
  });

  const invalidDesign = await createDesign({
    productType: "A product type",
    title: "An older design",
    userId: user.id,
  });

  const baseQuote: PricingQuote = {
    id: uuid.v4(),
    processes: [],
    createdAt: new Date(),
    pricingQuoteInputId: "",
    productType: "BLAZER",
    productComplexity: "COMPLEX",
    materialCategory: "BASIC",
    materialBudgetCents: 0,
    units: 0,
    baseCostCents: 0,
    materialCostCents: 0,
    processCostCents: 0,
    unitCostCents: 0,
    designId: "",
    creationTimeMs: 0,
    specificationTimeMs: 0,
    sourcingTimeMs: 0,
    samplingTimeMs: 0,
    preProductionTimeMs: 0,
    productionTimeMs: 0,
    fulfillmentTimeMs: 0,
    processTimeMs: 0,
  };

  const validQuote = {
    ...baseQuote,
    designId: validDesign.id,
  };

  const invalidQuote = {
    ...baseQuote,
    designId: invalidDesign.id,
    creationTimeMs: null,
    specificationTimeMs: null,
    sourcingTimeMs: null,
    samplingTimeMs: null,
    preProductionTimeMs: null,
    productionTimeMs: null,
    fulfillmentTimeMs: null,
    processTimeMs: null,
  };

  const timelines = await Service.formatTimelines(
    [validQuote, invalidQuote],
    [validDesign, invalidDesign]
  );

  t.equal(timelines.length, 1, "returns only valid timelines");
});
