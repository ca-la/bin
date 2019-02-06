import * as uuid from 'node-uuid';

import generatePricingValues from './pricing-values';
import generatePricingQuote from '../../services/generate-pricing-quote';

import { PricingQuote } from '../../domain-objects/pricing-quote';
import Bid from '../../domain-objects/bid';
import { create as createBid } from '../../dao/bids';
import createUser = require('../create-user');
import User = require('../../domain-objects/user');

interface BidInterface {
  user: User;
  quote: PricingQuote;
  bid: Bid;
}

export default async function generateBid(
  designId: string | null = null,
  userId: string | null = null
): Promise<BidInterface> {
  await generatePricingValues();
  const { user } = await createUser();

  const createdBy = userId || user.id;

  const quote = await generatePricingQuote({
    designId,
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
    createdAt: new Date(),
    createdBy,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  });

  return { bid, quote, user };
}
