import uuid from "node-uuid";

import { BidCreationPayload } from "../../components/bids/domain-object";
import createUser from "../../test-helpers/create-user";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import { authHeader, get, post, put } from "../../test-helpers/http";
import { create as createDesign } from "../../components/product-designs/dao";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import PricingCostInput from "../../components/pricing-cost-inputs/domain-object";
import { daysToMs } from "../../services/time-conversion";
import generateProductTypes from "../../services/generate-product-types";
import { Dollars } from "../../services/dollars";
import { checkout } from "../../test-helpers/checkout-collection";
import { CreatePricingCostInputRequest } from "../../components/pricing-cost-inputs/types";
import { PricingQuote } from "../../domain-objects/pricing-quote";

const getInputBid = (quote: PricingQuote): BidCreationPayload => ({
  bidPriceCents: 100000,
  bidPriceProductionOnlyCents: 0,
  description: "Full Service",
  dueDate: new Date(
    new Date(quote.createdAt).getTime() + daysToMs(10)
  ).toISOString(),
  quoteId: quote.id,
  taskTypeIds: [],
  revenueShareBasisPoints: 20,
  projectDueInMs: 0,
});

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

test("GET /pricing-quotes?designId&units returns unsaved quote", async (t: Test) => {
  const {
    user: { designer },
    collectionDesigns: [design],
  } = await checkout();

  const [response, unsavedQuote] = await get(
    `/pricing-quotes?designId=${design.id}&units=100`,
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(unsavedQuote, {
    designId: design.id,
    payLaterTotalCents: 527660,
    payNowTotalCents: 496000,
    timeTotalMs: 1219764706,
    units: 100,
    minimumOrderQuantity: 1,
  });
});

test("GET /pricing-quotes?designId&units with very large quantity", async (t: Test) => {
  const {
    user: { designer },
    collectionDesigns: [design],
  } = await checkout();

  const [response, unsavedQuote] = await get(
    `/pricing-quotes?designId=${design.id}&units=100000`,
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.equal(response.status, 200);
  t.equal(unsavedQuote.payLaterTotalCents > 0, true);
  t.equal(unsavedQuote.payNowTotalCents, 177700000);
});

test("POST /pricing-quotes/preview returns an unsaved quote from an uncommitted cost", async (t: Test) => {
  await generatePricingValues();
  const { user, session } = await createUser({ role: "ADMIN" });

  const design = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
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
});

test("POST /pricing-quotes/preview fails if there are no pricing values for the request", async (t: Test) => {
  const { user, session } = await createUser({ role: "ADMIN" });

  const design = await createDesign({
    productType: "A product type",
    title: "A design",
    userId: user.id,
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

test("PUT /pricing-quotes/:quoteId/bid/:bidId creates bid", async (t: Test) => {
  const now = new Date(2012, 11, 22);
  sandbox().useFakeTimers(now);
  const {
    quotes: [quote],
    user: { admin },
  } = await checkout();
  const inputBid = getInputBid(quote);
  const bidId = uuid.v4();

  const [putResponse, createdBid] = await put(
    `/pricing-quotes/${inputBid.quoteId}/bids/${bidId}`,
    {
      body: inputBid,
      headers: authHeader(admin.session.id),
    }
  );

  t.equal(putResponse.status, 201);
  t.deepEqual(createdBid, {
    acceptedAt: null,
    bidPriceCents: inputBid.bidPriceCents,
    bidPriceProductionOnlyCents: inputBid.bidPriceProductionOnlyCents,
    completedAt: null,
    createdAt: now.toISOString(),
    createdBy: admin.user.id,
    description: inputBid.description,
    dueDate: inputBid.dueDate,
    id: bidId,
    quoteId: inputBid.quoteId,
    revenueShareBasisPoints: inputBid.revenueShareBasisPoints,
  });
});

test("POST /pricing-quotes/:quoteId/bids creates bid", async (t: Test) => {
  const {
    user: { admin },
    quotes: [quote],
  } = await checkout();

  const inputBid = getInputBid(quote);

  const [postResponse, createdBid] = await post(
    `/pricing-quotes/${inputBid.quoteId}/bids`,
    {
      body: inputBid,
      headers: authHeader(admin.session.id),
    }
  );

  t.equal(postResponse.status, 201);
  t.deepEqual(createdBid, {
    acceptedAt: null,
    bidPriceCents: inputBid.bidPriceCents,
    bidPriceProductionOnlyCents: inputBid.bidPriceProductionOnlyCents,
    completedAt: null,
    createdAt: createdBid.createdAt,
    createdBy: admin.user.id,
    description: inputBid.description,
    dueDate: inputBid.dueDate,
    id: createdBid.id,
    quoteId: inputBid.quoteId,
    revenueShareBasisPoints: inputBid.revenueShareBasisPoints,
  });
});

test("GET /pricing-quotes/:quoteId/bids returns list of bids for quote", async (t: Test) => {
  const {
    user: { admin },
    quotes: [quote],
  } = await checkout();

  const inputBid = getInputBid(quote);

  const clock = sandbox().useFakeTimers(new Date(2020, 1, 2));

  const [, bid] = await post(`/pricing-quotes/${inputBid.quoteId}/bids`, {
    body: inputBid,
    headers: authHeader(admin.session.id),
  });

  const [response, bids] = await get(
    `/pricing-quotes/${inputBid.quoteId}/bids`,
    { headers: authHeader(admin.session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(bids, [
    {
      acceptedAt: null,
      bidPriceCents: inputBid.bidPriceCents,
      bidPriceProductionOnlyCents: inputBid.bidPriceProductionOnlyCents,
      completedAt: null,
      createdAt: bid.createdAt,
      createdBy: admin.user.id,
      description: inputBid.description,
      dueDate: inputBid.dueDate,
      id: bid.id,
      quoteId: inputBid.quoteId,
      revenueShareBasisPoints: inputBid.revenueShareBasisPoints,
    },
  ]);

  const hasExtras = {
    ...getInputBid(quote),
    XXXXXTRA: "Boom!",
  };

  const extrasTime = new Date(2020, 2, 1);
  clock.setSystemTime(extrasTime);

  await post(`/pricing-quotes/${inputBid.quoteId}/bids`, {
    body: hasExtras,
    headers: authHeader(admin.session.id),
  });

  const [withExtrasResponse, withExtrasBids] = await get(
    `/pricing-quotes/${inputBid.quoteId}/bids`,
    {
      headers: authHeader(admin.session.id),
    }
  );

  const sortedBids = withExtrasBids.sort(
    (a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  t.equal(withExtrasResponse.status, 200);
  t.deepEqual(sortedBids[1], {
    acceptedAt: null,
    bidPriceCents: hasExtras.bidPriceCents,
    bidPriceProductionOnlyCents: hasExtras.bidPriceProductionOnlyCents,
    completedAt: null,
    createdAt: extrasTime.toISOString(),
    createdBy: admin.user.id,
    description: hasExtras.description,
    dueDate: hasExtras.dueDate,
    id: sortedBids[1].id,
    quoteId: hasExtras.quoteId,
    revenueShareBasisPoints: hasExtras.revenueShareBasisPoints,
  });
});
