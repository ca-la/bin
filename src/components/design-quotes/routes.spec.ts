import Knex from "knex";
import uuid from "node-uuid";

import { test, Test, sandbox, db } from "../../test-helpers/fresh";
import { post, get, authHeader } from "../../test-helpers/http";
import SessionsDAO from "../../dao/sessions";
import * as PricingCostInputsDAO from "../pricing-cost-inputs/dao";
import { costCollection } from "../../test-helpers/cost-collection";
import ProductDesign from "../product-designs/domain-objects/product-design";
import FinancingAccountsDAO from "../financing-accounts/dao";

import { DesignQuote } from "./types";
import * as DesignQuoteService from "./service";

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
        description: "Service Fee",
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
    team,
  } = await costCollection();

  const financingAccount = await db.transaction((trx: Knex.Transaction) =>
    FinancingAccountsDAO.create(trx, {
      closedAt: null,
      createdAt: new Date(),
      creditLimitCents: 5_000_00,
      feeBasisPoints: 1000,
      id: uuid.v4(),
      teamId: team.id,
      termLengthDays: 90,
    })
  );

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
      balanceDueCents: 8_527_20 - Math.round(5_000_00 / 1.1),
      combinedLineItems: [
        {
          cents: 1_421_20,
          description: "Service Fee",
          explainerCopy:
            "A fee for what you produce with us, based on your plan",
        },
        {
          cents: Math.round((5_000_00 / 1.1) * 0.1),
          description: "Financing Fee",
          explainerCopy:
            "CALA Financing allows you to defer payment for your designs. You owe the total amount to CALA within the term defined in your Agreement",
        },
      ],
      creditAppliedCents: 0,
      dueLaterCents: 5_000_00,
      dueNowCents: 8_527_20 - Math.round(5_000_00 / 1.1),
      quotes: [
        {
          designId: collectionDesigns[0].id,
          lineItems: [
            {
              cents: 99200,
              description: "Service Fee",
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
              description: "Service Fee",
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
      financingItems: [
        {
          accountId: financingAccount.id,
          financedAmountCents: Math.round(5_000_00 / 1.1),
          feeAmountCents: Math.round((5_000_00 / 1.1) * 0.1),
          termLengthDays: financingAccount.termLengthDays,
        },
      ],
      subtotalCents: 710600,
      totalUnits: 200,
    },
    "returns calculated CartDetails with design quotes"
  );
});
