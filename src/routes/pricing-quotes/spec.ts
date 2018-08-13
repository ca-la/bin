import * as tape from 'tape';
import { get, post } from '../../test-helpers/http';
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import { PricingQuoteRequest } from '../../domain-objects/pricing-quote';
import { test } from '../../test-helpers/fresh';

test('/pricing-quotes POST -> GET quote', async (t: tape.Test) => {
  await generatePricingValues();
  const quote: PricingQuoteRequest = {
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
