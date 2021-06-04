import { test, Test, sandbox } from "../../test-helpers/fresh";
import { post, get, authHeader } from "../../test-helpers/http";
import SessionsDAO from "../../dao/sessions";
import * as PricingCostInputsDAO from "../pricing-cost-inputs/dao";
import * as DesignQuoteService from "./service";
import { DesignQuote } from "./types";
import { costCollection } from "../../test-helpers/cost-collection";
import ProductDesign from "../product-designs/domain-objects/product-design";

test("GET /design-quotes?designId&units: no auth", async (t: Test) => {
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

test("GET /design-quotes?designId&units: valid", async (t: Test) => {
  const designQuote: DesignQuote = {
    designId: "a-design-id",
    payLaterTotalCents: 10639,
    payNowTotalCents: 10000,
    timeTotalMs: 94,
    units: 100,
    minimumOrderQuantity: 1,
    lineItems: [
      {
        description: "Production Fee",
        explainerCopy: "A fee for what you produce with us, based on your plan",
        cents: 1000,
      },
    ],
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

test("POST /design-quotes: no auth", async (t: Test) => {
  const [noAuth] = await post("/design-quotes");

  t.equal(noAuth.status, 401, "requires authentication");
});

test("POST /design-quotes: valid", async (t: Test) => {
  const {
    user: { designer },
    collectionDesigns,
  } = await costCollection();

  const [response, body] = await post("/design-quotes", {
    headers: authHeader(designer.session.id),
    body: collectionDesigns.map((design: ProductDesign) => ({
      designId: design.id,
      units: 100,
    })),
  });

  t.equal(response.status, 200, "responds with a success response");
  t.deepEqual(
    body,
    {
      balanceDueCents: 852720,
      combinedLineItems: [
        {
          cents: 142120,
          description: "Production Fee",
          explainerCopy:
            "A fee for what you produce with us, based on your plan",
        },
      ],
      creditAppliedCents: 0,
      dueLaterCents: 0,
      dueNowCents: 852720,
      quotes: [
        {
          designId: collectionDesigns[0].id,
          lineItems: [
            {
              cents: 99200,
              description: "Production Fee",
              explainerCopy:
                "A fee for what you produce with us, based on your plan",
            },
          ],
          minimumOrderQuantity: 1,
          payLaterTotalCents: 527660,
          payNowTotalCents: 496000,
          timeTotalMs: 1219764706,
          units: 100,
        },
        {
          designId: collectionDesigns[1].id,
          lineItems: [
            {
              cents: 42920,
              description: "Production Fee",
              explainerCopy:
                "A fee for what you produce with us, based on your plan",
            },
          ],
          minimumOrderQuantity: 1,
          payLaterTotalCents: 228298,
          payNowTotalCents: 214600,
          timeTotalMs: 711529412,
          units: 100,
        },
      ],
      subtotalCents: 710600,
      totalUnits: 200,
    },
    "returns calculated CartDetails with design quotes"
  );
});
