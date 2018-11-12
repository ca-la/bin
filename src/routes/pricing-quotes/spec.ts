import * as uuid from 'node-uuid';

import { authHeader, get, post, put } from '../../test-helpers/http';
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import { PricingQuoteRequest } from '../../domain-objects/pricing-quote';
import { test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import Bid from '../../domain-objects/bid';
import { create as createDesign } from '../../dao/product-designs';
import { create as createCostInputs } from '../../dao/pricing-cost-inputs';

test('/pricing-quotes POST -> GET quote', async (t: Test) => {
  await generatePricingValues();
  const quote: PricingQuoteRequest = {
    designId: null,
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
    productType: 'TEESHIRT',
    units: 200
  };

  const [postResponse, createdQuote] = await post('/pricing-quotes', { body: quote });

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
  await generatePricingValues();
  const one: PricingQuoteRequest = {
    designId: null,
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
    productType: 'TEESHIRT',
    units: 200
  };
  const two: PricingQuoteRequest = {
    designId: design.id,
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
    productType: 'TEESHIRT',
    units: 200
  };

  await post('/pricing-quotes', { body: one });
  const createdTwo = await post('/pricing-quotes', { body: two });

  const [getResponse, designQuotes] = await get(
    `/pricing-quotes?designId=${design.id}`,
    { headers: authHeader(session.id) }
  );

  t.equal(getResponse.status, 200);
  t.deepEquals(
    designQuotes,
    [createdTwo[1]],
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
  await createCostInputs({
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
  const quote: PricingQuoteRequest = {
    designId: null,
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
    productType: 'TEESHIRT',
    units: 200
  };
  const createdQuote = await post('/pricing-quotes', { body: quote });

  const inputBid: Bid = {
    bidPriceCents: 100000,
    createdAt: new Date(2012, 12, 22),
    createdBy: user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: createdQuote[1].id
  };

  const [putResponse, createdBid] = await put(
    `/pricing-quotes/${inputBid.quoteId}/bid/${inputBid.id}`,
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
