import * as uuid from 'node-uuid';

import generatePricingValues from './pricing-values';
import generatePricingQuote from '../../services/generate-pricing-quote';

import { PricingQuote } from '../../domain-objects/pricing-quote';
import Bid from '../../components/bids/domain-object';
import { create as createBid } from '../../components/bids/dao';
import createUser = require('../create-user');
import User = require('../../domain-objects/user');

interface BidInterface {
  user: User;
  quote: PricingQuote;
  bid: Bid;
}

interface GenerateBidInputs {
  bidOptions?: Partial<Bid>;
  designId: string | null;
  generatePricing?: boolean;
  userId: string | null;
}

export default async function generateBid({
  bidOptions = {},
  designId = null,
  generatePricing = true,
  userId = null
}: Partial<GenerateBidInputs> = {}): Promise<BidInterface> {
  if (generatePricing) {
    await generatePricingValues();
  }
  const { user } = await createUser();

  const createdBy = userId || user.id;

  const quote = await generatePricingQuote({
    designId: designId || null,
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
    quoteId: quote.id,
    ...bidOptions
  });

  return { bid, quote, user };
}
