import tape from "tape";
import uuid from "node-uuid";

import * as Service from "./service";
import { test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { PricingQuote } from "../../domain-objects/pricing-quote";
import createDesign from "../../services/create-design";
import {
  Complexity,
  MaterialCategory,
  ProductType,
} from "../../domain-objects/pricing";

test("format timelines only returns valid timelines", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const validDesign = await createDesign({
    title: "A newer design",
    userId: user.id,
  });

  const invalidDesign = await createDesign({
    title: "An older design",
    userId: user.id,
  });

  const baseQuote: PricingQuote = {
    id: uuid.v4(),
    processes: [],
    createdAt: new Date(),
    pricingQuoteInputId: "",
    productType: ProductType.BLAZER,
    productComplexity: Complexity.COMPLEX,
    materialCategory: MaterialCategory.BASIC,
    materialBudgetCents: 0,
    units: 0,
    baseCostCents: 0,
    materialCostCents: 0,
    processCostCents: 0,
    unitCostCents: 0,
    productionFeeCents: 0,
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
