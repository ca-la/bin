import * as uuid from 'node-uuid';

import { authHeader, get, post, put } from '../../test-helpers/http';
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import { PricingQuoteRequest } from '../../domain-objects/pricing-quote';
import { test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import Bid from '../../domain-objects/bid';

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
