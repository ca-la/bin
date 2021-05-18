import { test, Test, sandbox } from "../../test-helpers/fresh";
import { get, authHeader } from "../../test-helpers/http";
import SessionsDAO from "../../dao/sessions";
import * as PricingCostInputsDAO from "../pricing-cost-inputs/dao";
import * as DesignQuoteService from "./service";
import { DesignQuote } from "./types";

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
  const designQuote: DesignQuote = {
    designId: "a-design-id",
    payLaterTotalCents: 10639,
    payNowTotalCents: 10000,
    timeTotalMs: 94,
    units: 100,
    minimumOrderQuantity: 1,
    lineItems: [{ description: "Production Fee", cents: 1000 }],
  };
  sandbox().stub(SessionsDAO, "findById").resolves({
    id: "a-session-id",
    userId: "a-user-id",
    role: "USER",
  });

  sandbox()
    .stub(PricingCostInputsDAO, "findByDesignId")
    .resolves([{ id: "a-pricing-cost-input-id", minimumOrderQuantity: 1 }]);

  sandbox()
    .stub(DesignQuoteService, "calculateDesignQuote")
    .resolves(designQuote);

  const [response, body] = await get(
    "/design-quotes?designId=a-design-id&units=100",
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(response.status, 200, "returns a success response");
  t.deepEqual(body, designQuote);
});
