import { test, Test } from "../../test-helpers/simple";
import addTimeBuffer, { getTimeBuffer } from ".";

test("addTimeBuffer adds the correct amount of buffer", (t: Test) => {
  const actual = addTimeBuffer(72);
  const expected = 85;
  t.equal(actual, expected, "it returns the expected buffer");
});

test("addTimeBuffer rounds to the nearest int", (t: Test) => {
  const actual = addTimeBuffer(1.1);
  const expected = 1;
  t.equal(actual, expected, "it returns the expected buffer");
});

test("addTimeBuffer adds to 0", (t: Test) => {
  const actual = addTimeBuffer(0);
  const expected = 0;
  t.equal(actual, expected, "it returns the expected buffer");
});

test("addTimeBuffer adds correct buffer to 1000", (t: Test) => {
  const actual = addTimeBuffer(1000);
  const expected = 1176;
  t.equal(actual, expected, "it returns the expected buffer");
});

test("getTimeBuffer gets correct buffer to 1000", (t: Test) => {
  const actual = getTimeBuffer({
    id: "123",
    designId: "123",
    pricingQuoteInputId: "123",
    createdAt: new Date(),
    processes: [],
    productType: "BATHROBE",
    processCostCents: 0,
    productComplexity: "COMPLEX",
    materialCategory: "BASIC",
    materialBudgetCents: 0,
    materialCostCents: 12,
    units: 50,
    baseCostCents: 100,
    unitCostCents: 50,
    creationTimeMs: 0,
    fulfillmentTimeMs: 100,
    preProductionTimeMs: 100,
    productionTimeMs: 100,
    processTimeMs: 100,
    samplingTimeMs: 100,
    sourcingTimeMs: 100,
    specificationTimeMs: 400,
  });
  const expected = 176;
  t.equal(actual, expected, "it returns the expected buffer");
});

test("getTimeBuffer rounds buffer to nearest int", (t: Test) => {
  const actual = getTimeBuffer({
    id: "123",
    designId: "123",
    pricingQuoteInputId: "123",
    createdAt: new Date(),
    processes: [],
    productType: "BATHROBE",
    processCostCents: 0,
    productComplexity: "COMPLEX",
    materialCategory: "BASIC",
    materialBudgetCents: 0,
    materialCostCents: 12,
    units: 50,
    baseCostCents: 100,
    unitCostCents: 50,
    creationTimeMs: 0,
    fulfillmentTimeMs: 100,
    preProductionTimeMs: 100,
    productionTimeMs: 100,
    processTimeMs: 100,
    samplingTimeMs: 100,
    sourcingTimeMs: 100,
    specificationTimeMs: 400.1,
  });
  const expected = 176;
  t.equal(actual, expected, "it returns the expected buffer");
});

test("getTimeBuffer returns 0", (t: Test) => {
  const actual = getTimeBuffer({
    id: "123",
    designId: "123",
    pricingQuoteInputId: "123",
    createdAt: new Date(),
    processes: [],
    productType: "BATHROBE",
    processCostCents: 0,
    productComplexity: "COMPLEX",
    materialCategory: "BASIC",
    materialBudgetCents: 0,
    materialCostCents: 12,
    units: 50,
    baseCostCents: 100,
    unitCostCents: 50,
    creationTimeMs: 0,
    fulfillmentTimeMs: 0,
    preProductionTimeMs: 0,
    productionTimeMs: 0,
    processTimeMs: 0,
    samplingTimeMs: 0,
    sourcingTimeMs: 0,
    specificationTimeMs: 0,
  });
  const expected = 0;
  t.equal(actual, expected, "it returns the expected buffer");
});
