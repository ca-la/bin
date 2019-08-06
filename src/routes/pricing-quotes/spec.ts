import * as uuid from 'node-uuid';
import * as sinon from 'sinon';

import * as db from '../../services/db';
import * as DesignEventsDAO from '../../dao/design-events';
import * as PricingCostInputsDAO from '../../dao/pricing-cost-inputs';
import Bid from '../../components/bids/domain-object';
import createUser = require('../../test-helpers/create-user');
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import { authHeader, get, post, put } from '../../test-helpers/http';
import { create as createDesign } from '../../dao/product-designs';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import generateCollection from '../../test-helpers/factories/collection';
import * as CollectionsDAO from '../../components/collections/dao';
import * as SlackService from '../../services/slack';
import PricingCostInput, {
  PricingCostInputWithoutVersions
} from '../../domain-objects/pricing-cost-input';
import { daysToMs } from '../../services/time-conversion';
import generateProductTypes from '../../services/generate-product-types';
import { Dollars } from '../../services/dollars';

test('/pricing-quotes POST -> GET quote fails with malformed inputs', async (t: Test) => {
  const { user, session } = await createUser();
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await generatePricingValues();
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });
  await db('pricing_constants').del();

  const [failedResponse] = await post('/pricing-quotes', {
    body: [
      {
        designId: design.id,
        units: 300
      }
    ],
    headers: authHeader(session.id)
  });

  t.equal(failedResponse.status, 500, 'fails to create the quote');
});

test('/pricing-quotes POST -> GET quote from original version', async (t: Test) => {
  const { user, session } = await createUser();
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });

  await generatePricingValues();
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });
  const [postResponse, createdQuotes] = await post('/pricing-quotes', {
    body: [
      {
        designId: design.id,
        units: 300
      }
    ],
    headers: authHeader(session.id)
  });

  t.equal(postResponse.status, 201, 'successfully creates the quote');

  const pricingProductTypeTee = generateProductTypes({
    contrast: [0.15, 0.5, 1, 0],
    typeMediumCents: Dollars(30),
    typeMediumDays: 10,
    typeName: 'TEESHIRT',
    typeYield: 1.5,
    version: 1
  });
  await db.insert(pricingProductTypeTee).into('pricing_product_types');

  const [getResponse, retrievedQuote] = await get(
    `/pricing-quotes/${createdQuotes[0].id}`
  );

  t.equal(getResponse.status, 200, 'successfully retrieves saved quote');
  t.deepEquals(
    createdQuotes[0],
    retrievedQuote,
    'retrieved quote is identical to saved quote'
  );
});

test('POST /pricing-quotes creates commit event', async (t: Test) => {
  const { user, session } = await createUser();
  await generatePricingValues();

  const { collection } = await generateCollection({ createdBy: user.id });
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await CollectionsDAO.moveDesign(collection.id, design.id);

  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const slackStub = sandbox()
    .stub(SlackService, 'enqueueSend')
    .resolves();

  await post('/pricing-quotes', {
    body: [
      {
        designId: design.id,
        units: 300
      }
    ],
    headers: authHeader(session.id)
  });

  const events = await DesignEventsDAO.findByDesignId(design.id);
  t.equal(events.length, 1);
  t.equal(events[0].type, 'COMMIT_QUOTE');

  // Sends a slack notification
  sinon.assert.callCount(slackStub, 1);
});

test('/pricing-quotes?designId retrieves the set of quotes for a design', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  const otherDesign = await createDesign({
    productType: 'A different product type',
    title: 'A different design',
    userId: user.id
  });
  await generatePricingValues();
  await PricingCostInputsDAO.create({
    createdAt: yesterday,
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: otherDesign.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [, created] = await post('/pricing-quotes', {
    body: [
      {
        designId: design.id,
        units: 300
      }
    ],
    headers: authHeader(session.id)
  });

  await post('/pricing-quotes', {
    body: [
      {
        designId: otherDesign.id,
        units: 300
      }
    ],
    headers: authHeader(session.id)
  });

  const [getResponse, designQuotes] = await get(
    `/pricing-quotes?designId=${design.id}`,
    { headers: authHeader(session.id) }
  );

  t.equal(getResponse.status, 200);
  t.deepEquals(
    designQuotes,
    [created[0]],
    'Retrieves only the quote associated with this design'
  );
});

test('GET /pricing-quotes?designId&units returns unsaved quote', async (t: Test) => {
  await generatePricingValues();
  const { user, session } = await createUser();
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [response, unsavedQuote] = await get(
    `/pricing-quotes?designId=${design.id}&units=100`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(unsavedQuote, {
    designId: design.id,
    payLaterTotalCents: 527660,
    payNowTotalCents: 496000,
    timeTotalMs: 1219764706,
    units: 100
  });
});

test('GET /pricing-quotes?designId&units with very large quantity', async (t: Test) => {
  await generatePricingValues();
  const { user, session } = await createUser();
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [response, unsavedQuote] = await get(
    `/pricing-quotes?designId=${design.id}&units=100000`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.equal(unsavedQuote.payLaterTotalCents > 0, true);
  t.equal(unsavedQuote.payNowTotalCents, 177700000);
});

test('POST /pricing-quotes/preview returns an unsaved quote from an uncommitted cost', async (t: Test) => {
  await generatePricingValues();
  const { user, session } = await createUser({ role: 'ADMIN' });

  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  const uncommittedCostInput: PricingCostInputWithoutVersions = {
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  };

  const nullUncommittedCostInput: object = {
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: null
  };
  const [badResponse] = await post('/pricing-quotes/preview', {
    body: {
      nullUncommittedCostInput,
      units: 100
    },
    headers: authHeader(session.id)
  });

  t.equal(badResponse.status, 400);

  const [response, unsavedQuote] = await post('/pricing-quotes/preview', {
    body: {
      uncommittedCostInput,
      units: 100
    },
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.deepEqual(unsavedQuote, {
    payLaterTotalCents: 527660,
    payLaterTotalCentsPerUnit: 5277,
    payNowTotalCents: 496000,
    payNowTotalCentsPerUnit: 4960,
    timeTotalMs: 1219764706
  });

  const pricingProductTypeTee = generateProductTypes({
    contrast: [0.15, 0.5, 1, 0],
    typeMediumCents: Dollars(30),
    typeMediumDays: 10,
    typeName: 'TEESHIRT',
    typeYield: 1.5,
    version: 1
  });
  await db.insert(pricingProductTypeTee).into('pricing_product_types');

  const [response2, unsavedQuote2] = await post('/pricing-quotes/preview', {
    body: {
      uncommittedCostInput,
      units: 100
    },
    headers: authHeader(session.id)
  });

  t.equal(response2.status, 200);
  t.deepEqual(
    unsavedQuote2,
    {
      payLaterTotalCents: 659575,
      payLaterTotalCentsPerUnit: 6596,
      payNowTotalCents: 620000,
      payNowTotalCentsPerUnit: 6200,
      timeTotalMs: 1423058824
    },
    'quote is on new pricing'
  );
});

test('POST /pricing-quotes/preview fails if there are no pricing values for the request', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });

  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  const uncommittedCostInput: PricingCostInput = {
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT',
    processTimelinesVersion: 0,
    processesVersion: 0,
    productMaterialsVersion: 0,
    productTypeVersion: 0,
    marginVersion: 0,
    constantsVersion: 0,
    careLabelsVersion: 0
  };

  const [failedResponse] = await post('/pricing-quotes/preview', {
    body: {
      uncommittedCostInput,
      units: 100
    },
    headers: authHeader(session.id)
  });

  t.equal(failedResponse.status, 500, 'fails to create the quote');
});

test('POST /pricing-quotes/preview is an admin-only endpoint', async (t: Test) => {
  const { session } = await createUser();
  const [response] = await post('/pricing-quotes/preview', {
    body: {},
    headers: authHeader(session.id)
  });
  t.equal(response.status, 403);
});

test('POST /pricing-quotes/preview requires units and a cost input', async (t: Test) => {
  const { session } = await createUser({ role: 'ADMIN' });
  const [responseOne] = await post('/pricing-quotes/preview', {
    body: { fizz: 'buzz' },
    headers: authHeader(session.id)
  });
  t.equal(responseOne.status, 400);

  const [responseTwo] = await post('/pricing-quotes/preview', {
    body: {
      uncommittedCostInput: {
        foo: 'bar'
      },
      units: 'blah'
    },
    headers: authHeader(session.id)
  });
  t.equal(responseTwo.status, 400);
});

test('PUT /pricing-quotes/:quoteId/bid/:bidId creates bid', async (t: Test) => {
  await generatePricingValues();
  const { user, session } = await createUser({ role: 'ADMIN' });
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [, createdQuotes] = await post('/pricing-quotes', {
    body: [
      {
        designId: design.id,
        units: 200
      }
    ],
    headers: authHeader(session.id)
  });

  const inputBid: Bid = {
    acceptedAt: null,
    bidPriceCents: 100000,
    projectDueInMs: daysToMs(10),
    createdAt: new Date(2012, 12, 22),
    createdBy: user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: createdQuotes[0].id
  };

  const [putResponse, createdBid] = await put(
    `/pricing-quotes/${inputBid.quoteId}/bids/${inputBid.id}`,
    {
      body: { ...inputBid, taskTypeIds: [] },
      headers: authHeader(session.id)
    }
  );

  t.equal(putResponse.status, 201);
  t.deepEqual(createdBid, {
    ...inputBid,
    createdAt: inputBid.createdAt.toISOString()
  });
});

test('POST /pricing-quotes/:quoteId/bids creates bid', async (t: Test) => {
  await generatePricingValues();
  const { user, session } = await createUser({ role: 'ADMIN' });
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [, createdQuotes] = await post('/pricing-quotes', {
    body: [
      {
        designId: design.id,
        units: 200
      }
    ],
    headers: authHeader(session.id)
  });

  const inputBid: Unsaved<Bid> = {
    acceptedAt: null,
    bidPriceCents: 100000,
    projectDueInMs: daysToMs(10),
    createdBy: user.id,
    description: 'Full Service',
    quoteId: createdQuotes[0].id
  };

  const [postResponse, createdBid] = await post(
    `/pricing-quotes/${inputBid.quoteId}/bids`,
    {
      body: { ...inputBid, taskTypeIds: [] },
      headers: authHeader(session.id)
    }
  );

  t.equal(postResponse.status, 201);
  t.deepEqual(createdBid, {
    ...inputBid,
    createdAt: createdBid.createdAt,
    id: createdBid.id
  });
});

test('GET /pricing-quotes/:quoteId/bids returns list of bids for quote', async (t: Test) => {
  await generatePricingValues();
  const { user, session } = await createUser({ role: 'ADMIN' });
  const design = await createDesign({
    productType: 'A product type',
    title: 'A design',
    userId: user.id
  });
  await PricingCostInputsDAO.create({
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [, createdQuotes] = await post('/pricing-quotes', {
    body: [
      {
        designId: design.id,
        units: 200
      }
    ],
    headers: authHeader(session.id)
  });

  const inputBid: Bid = {
    acceptedAt: null,
    bidPriceCents: 100000,
    projectDueInMs: daysToMs(10),
    createdAt: new Date(2012, 12, 22),
    createdBy: user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: createdQuotes[0].id
  };

  await put(`/pricing-quotes/${inputBid.quoteId}/bids/${inputBid.id}`, {
    body: { ...inputBid, taskTypeIds: [] },
    headers: authHeader(session.id)
  });

  const [response, bids] = await get(
    `/pricing-quotes/${inputBid.quoteId}/bids`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(bids, [
    {
      ...inputBid,
      createdAt: inputBid.createdAt.toISOString()
    }
  ]);
});
