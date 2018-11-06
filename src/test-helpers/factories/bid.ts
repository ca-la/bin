import * as uuid from 'node-uuid';

import generatePricingValues from './pricing-values';
import generatePricingQuote from '../../services/generate-pricing-quote';

import { PricingQuote } from '../../domain-objects/pricing-quote';
import Bid from '../../domain-objects/bid';
import { create as createBid } from '../../dao/bids';
import createUser = require('../create-user');
import User from '../../domain-objects/user';

interface BidInterface {
  user: User;
  quote: PricingQuote;
  bid: Bid;
}

export default async function generateBid(): Promise<BidInterface> {
  await generatePricingValues();
  const { user } = await createUser();

  const quote = await generatePricingQuote({
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
  });
  const bid = await createBid({
    bidPriceCents: 100000,
    createdAt: new Date(2012, 12, 22),
    createdBy: user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  });

  return { bid, quote, user };
}
