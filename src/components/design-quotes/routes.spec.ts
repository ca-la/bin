import { test, Test, sandbox } from "../../test-helpers/fresh";
import { get, authHeader } from "../../test-helpers/http";
import SessionsDAO from "../../dao/sessions";
import * as PricingCostInputsDAO from "../pricing-cost-inputs/dao";
import * as GeneratePricingQuoteService from "../../services/generate-pricing-quote";

test("GET /design-quotes: no auth", async (t: Test) => {
  const [noAuth] = await get("/design-quotes?designId=a-design-id&units=100");

  t.equal(noAuth.status, 401, "requires authentication");
});

test("GET /design-quotes: no design ID", async (t: Test) => {
  sandbox().stub(SessionsDAO, "findById").resolves({
    id: "a-session-id",
    userId: "a-user-id",
    role: "USER",
  });

  const [noDesignId] = await get("/design-quotes?units=100", {
    headers: authHeader("a-session-id"),
  });

  t.equal(noDesignId.status, 400, "requires a designId in query params");
});

test("GET /design-quotes: no units", async (t: Test) => {
  sandbox().stub(SessionsDAO, "findById").resolves({
    id: "a-session-id",
    userId: "a-user-id",
    role: "USER",
  });

  const [noUnits] = await get("/design-quotes?designId=a-design-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(noUnits.status, 400, "requires a units in query params");
});

test("GET /design-quotes: valid", async (t: Test) => {
  sandbox().stub(SessionsDAO, "findById").resolves({
    id: "a-session-id",
    userId: "a-user-id",
    role: "USER",
  });

  sandbox()
    .stub(PricingCostInputsDAO, "findByDesignId")
    .resolves([{ id: "a-pricing-cost-input-id", minimumOrderQuantity: 1 }]);
  const unsavedQuote: GeneratePricingQuoteService.UnsavedQuote = {
    baseCostCents: 10000,
    creationTimeMs: 10,
    designId: "a-design-id",
    fulfillmentTimeMs: 10,
    materialBudgetCents: 1000,
    materialCategory: "BASIC",
    materialCostCents: 1000,
    preProductionTimeMs: 10,
    processCostCents: 0,
    processTimeMs: 10,
    productComplexity: "MEDIUM",
    productType: "ACCESSORIES - BACKPACK",
    productionTimeMs: 10,
    samplingTimeMs: 10,
    sourcingTimeMs: 10,
    specificationTimeMs: 10,
    unitCostCents: 100,
    units: 100,
  };
  sandbox()
    .stub(GeneratePricingQuoteService, "generateUnsavedQuote")
    .resolves(unsavedQuote);

  const [response, body] = await get(
    "/design-quotes?designId=a-design-id&units=100",
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(response.status, 200, "returns a success response");
  const FINANCE_MARGIN_CENTS = 639;
  const TIME_BUFFER_MS = 14;
  t.deepEqual(body, {
    designId: "a-design-id",
    payLaterTotalCents: 10000 + FINANCE_MARGIN_CENTS,
    payNowTotalCents: 10000,
    timeTotalMs: 80 + TIME_BUFFER_MS,
    units: 100,
    minimumOrderQuantity: 1,
  });
});
