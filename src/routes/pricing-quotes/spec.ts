import * as uuid from 'node-uuid';

import { authHeader, get, post, put } from '../../test-helpers/http';
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import { test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import Bid from '../../domain-objects/bid';
import { create as createDesign } from '../../dao/product-designs';
import * as PricingCostInputsDAO from '../../dao/pricing-cost-inputs';

test('/pricing-quotes POST -> GET quote', async (t: Test) => {
  const { user, session } = await createUser();
  await generatePricingValues();
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
    processes: [{
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }, {
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [postResponse, createdQuote] = await post(
    `/pricing-quotes?designId=${design.id}&units=300`,
    { headers: authHeader(session.id) }
  );

  t.equal(postResponse.status, 201, 'successfully creates the quote');

  const [getResponse, retrievedQuote] = await get(`/pricing-quotes/${createdQuote.id}`);

  t.equal(getResponse.status, 200, 'successfully retrieves saved quote');
  t.deepEquals(
    createdQuote,
    retrievedQuote,
    'retrieved quote is identical to saved quote'
  );
});

test('/pricing-quotes?designId retrieves the set of quotes for a design', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
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
    createdAt: new Date(),
    deletedAt: null,
    designId: design.id,
    id: uuid.v4(),
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [{
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }, {
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }],
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
    processes: [{
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }, {
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const created = await post(
    `/pricing-quotes?designId=${design.id}&units=300`,
    { headers: authHeader(session.id) }
  );
  await post(
    `/pricing-quotes?designId=${otherDesign.id}&units=300`,
    { headers: authHeader(session.id) }
  );

  const [getResponse, designQuotes] = await get(
    `/pricing-quotes?designId=${design.id}`,
    { headers: authHeader(session.id) }
  );

  t.equal(getResponse.status, 200);
  t.deepEquals(
    designQuotes,
    [created[1]],
    'Retrieves only the quote associated with this design'
  );
});

test('GET /pricing-quotes?designId&quantity returns unsaved quote', async (t: Test) => {
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
    processes: [{
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }, {
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });

  const [response, unsavedQuote] = await get(
    `/pricing-quotes?designId=${design.id}&units=100`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(unsavedQuote, {
    baseCostCents: 2288,
    designId: design.id,
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    materialCostCents: 1200,
    processCostCents: 280,
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT',
    unitCostCents: 4891,
    units: 100
  });
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
    processes: [{
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }, {
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });
  const createdQuote = await post(
    `/pricing-quotes?designId=${design.id}&units=200`,
    { headers: authHeader(session.id) }
  );

  const inputBid: Bid = {
    bidPriceCents: 100000,
    createdAt: new Date(2012, 12, 22),
    createdBy: user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: createdQuote[1].id
  };

  const [putResponse, createdBid] = await put(
    `/pricing-quotes/${inputBid.quoteId}/bids/${inputBid.id}`,
    {
      body: inputBid,
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
    processes: [{
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }, {
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });
  const createdQuote = await post(
    `/pricing-quotes?designId=${design.id}&units=200`,
    { headers: authHeader(session.id) }
  );

  const inputBid: Unsaved<Bid> = {
    bidPriceCents: 100000,
    createdBy: user.id,
    description: 'Full Service',
    quoteId: createdQuote[1].id
  };

  const [postResponse, createdBid] = await post(
    `/pricing-quotes/${inputBid.quoteId}/bids`,
    {
      body: inputBid,
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
    processes: [{
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }, {
      complexity: '1_COLOR',
      name: 'SCREEN_PRINTING'
    }],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT'
  });
  const createdQuote = await post(
    `/pricing-quotes?designId=${design.id}&units=200`,
    { headers: authHeader(session.id) }
  );

  const inputBid: Bid = {
    bidPriceCents: 100000,
    createdAt: new Date(2012, 12, 22),
    createdBy: user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: createdQuote[1].id
  };

  await put(
    `/pricing-quotes/${inputBid.quoteId}/bids/${inputBid.id}`,
    { body: inputBid, headers: authHeader(session.id) }
  );

  const [response, bids] = await get(
    `/pricing-quotes/${inputBid.quoteId}/bids`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(bids, [{
    ...inputBid,
    createdAt: inputBid.createdAt.toISOString()
  }]);
});
