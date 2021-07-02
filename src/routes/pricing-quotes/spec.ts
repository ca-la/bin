import Knex from "knex";
import uuid from "node-uuid";

import createUser from "../../test-helpers/create-user";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import { authHeader, get, post } from "../../test-helpers/http";
import { test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import PricingCostInput from "../../components/pricing-cost-inputs/domain-object";
import * as SubscriptionsDAO from "../../components/subscriptions/dao";
import generateProductTypes from "../../services/generate-product-types";
import { Dollars } from "../../services/dollars";
import { checkout } from "../../test-helpers/checkout-collection";
import { CreatePricingCostInputRequest } from "../../components/pricing-cost-inputs/types";
import generateBid from "../../test-helpers/factories/bid";
import createDesign from "../../services/create-design";
import generateCollection from "../../test-helpers/factories/collection";

test("/pricing-quotes?designId retrieves the set of quotes for a design", async (t: Test) => {
  const {
    collectionDesigns: [design],
    quotes,
    user: { admin },
  } = await checkout();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const [getResponse, designQuotes] = await get(
    `/pricing-quotes?designId=${design.id}`,
    {
      headers: authHeader(admin.session.id),
    }
  );

  t.equal(getResponse.status, 200);
  t.deepEquals(
    designQuotes,
    [JSON.parse(JSON.stringify(quotes[0]))],
    "Retrieves only the quote associated with this design"
  );
});

test("POST /pricing-quotes/preview returns an unsaved quote from an uncommitted cost", async (t: Test) => {
  await generatePricingValues();
  const { user, session } = await createUser({ role: "ADMIN" });

  const { collection, team } = await generateCollection();
  const design = await createDesign({
    title: "A design",
    userId: user.id,
    collectionIds: [collection.id],
  });
  const uncommittedCostInput: CreatePricingCostInputRequest = {
    designId: design.id,
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
  };

  const [badRequest, notFoundMessage] = await post("/pricing-quotes/preview", {
    body: {
      uncommittedCostInput: {
        ...uncommittedCostInput,
        productType: null,
      },
      units: 100,
    },
    headers: authHeader(session.id),
  });
  t.equal(
    badRequest.status,
    400,
    "invalid or missing input returns a bad request status"
  );
  t.true(
    /Pricing product type could not be found/.test(notFoundMessage.message),
    "returns relevant error message"
  );

  const [response, unsavedQuote] = await post("/pricing-quotes/preview", {
    body: {
      uncommittedCostInput,
      units: 100,
    },
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200);
  t.deepEqual(unsavedQuote, {
    payLaterTotalCents: 527660,
    payLaterTotalCentsPerUnit: 5277,
    payNowTotalCents: 496000,
    payNowTotalCentsPerUnit: 4960,
    timeTotalMs: 1219764706,
  });

  const pricingProductTypeTee = generateProductTypes({
    contrast: [0.15, 0.5, 1, 0],
    typeMediumCents: Dollars(30),
    typeMediumDays: 10,
    typeName: "TEESHIRT",
    typeYield: 1.5,
    version: 1,
  });
  await db.insert(pricingProductTypeTee).into("pricing_product_types");

  const [response2, unsavedQuote2] = await post("/pricing-quotes/preview", {
    body: {
      uncommittedCostInput,
      units: 100,
    },
    headers: authHeader(session.id),
  });

  t.equal(response2.status, 200);
  t.deepEqual(
    unsavedQuote2,
    {
      payLaterTotalCents: 659575,
      payLaterTotalCentsPerUnit: 6596,
      payNowTotalCents: 620000,
      payNowTotalCentsPerUnit: 6200,
      timeTotalMs: 1423058824,
    },
    "quote is on new pricing"
  );

  await db.transaction(async (trx: Knex.Transaction) => {
    const active = await SubscriptionsDAO.findActiveByTeamId(trx, team.id);
    if (!active) {
      throw new Error("Could not find subscription after setup. Unexpected");
    }

    await SubscriptionsDAO.update(active.id, { cancelledAt: new Date() }, trx);
  });

  const [, noActiveSubscription] = await post("/pricing-quotes/preview", {
    body: {
      uncommittedCostInput,
      units: 100,
    },
    headers: authHeader(session.id),
  });

  t.deepEqual(
    noActiveSubscription,
    {
      payLaterTotalCents: 659575,
      payLaterTotalCentsPerUnit: 6596,
      payNowTotalCents: 620000,
      payNowTotalCentsPerUnit: 6200,
      timeTotalMs: 1423058824,
    },
    "returns quote even with no active subscription on the team"
  );
});

test("POST /pricing-quotes/preview fails if there are no pricing values for the request", async (t: Test) => {
  const { user, session } = await createUser({ role: "ADMIN" });

  const { collection } = await generateCollection();
  const design = await createDesign({
    title: "A design",
    userId: user.id,
    collectionIds: [collection.id],
  });
  const uncommittedCostInput: PricingCostInput = {
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    expiresAt: null,
    id: uuid.v4(),
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
    unitMaterialMultipleVersion: 0,
    minimumOrderQuantity: 1,
  };

  const [failedResponse] = await post("/pricing-quotes/preview", {
    body: {
      uncommittedCostInput,
      units: 100,
    },
    headers: authHeader(session.id),
  });

  t.equal(failedResponse.status, 400, "fails to create the quote");
});

test("POST /pricing-quotes/preview is an admin-only endpoint", async (t: Test) => {
  const { session } = await createUser();
  const [response] = await post("/pricing-quotes/preview", {
    body: {},
    headers: authHeader(session.id),
  });
  t.equal(response.status, 403);
});

test("POST /pricing-quotes/preview requires units and a cost input", async (t: Test) => {
  const { session } = await createUser({ role: "ADMIN" });
  const [responseOne] = await post("/pricing-quotes/preview", {
    body: { fizz: "buzz" },
    headers: authHeader(session.id),
  });
  t.equal(responseOne.status, 400);

  const [responseTwo] = await post("/pricing-quotes/preview", {
    body: {
      uncommittedCostInput: {
        foo: "bar",
      },
      units: "blah",
    },
    headers: authHeader(session.id),
  });
  t.equal(responseTwo.status, 400);
});

test("GET /pricing-quotes/:quoteId/bids returns list of bids for quote", async (t: Test) => {
  const {
    user: { admin },
    quotes: [quote],
    collectionDesigns: [design],
  } = await checkout();

  const { bid } = await generateBid({
    quoteId: quote.id,
    designId: design.id,
    generatePricing: false,
  });

  const [response, bids] = await get(`/pricing-quotes/${quote.id}/bids`, {
    headers: authHeader(admin.session.id),
  });

  t.equal(response.status, 200);
  t.deepEqual(bids, [JSON.parse(JSON.stringify(bid))]);
});
