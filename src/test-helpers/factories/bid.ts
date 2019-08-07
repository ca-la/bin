import * as uuid from 'node-uuid';

import generatePricingValues from './pricing-values';
import generatePricingQuote from '../../services/generate-pricing-quote';

import { PricingQuote } from '../../domain-objects/pricing-quote';
import * as PricingQuotesDAO from '../../dao/pricing-quotes';
import Bid, { BidCreationPayload } from '../../components/bids/domain-object';
import { create as createBid } from '../../components/bids/dao';
import createUser = require('../create-user');
import User from '../../components/users/domain-object';
import { daysToMs } from '../../services/time-conversion';

interface BidInterface {
  user: User;
  quote: PricingQuote;
  bid: Bid;
}

interface GenerateBidInputs {
  bidOptions?: Partial<BidCreationPayload>;
  quoteId: string | null;
  designId: string | null;
  generatePricing?: boolean;
  userId: string | null;
}

export default async function generateBid({
  bidOptions = {},
  designId = null,
  quoteId = null,
  generatePricing = true,
  userId = null
}: Partial<GenerateBidInputs> = {}): Promise<BidInterface> {
  if (generatePricing) {
    await generatePricingValues();
  }
  const { user } = await createUser();

  const createdBy = userId || user.id;

  const quote = quoteId
    ? await PricingQuotesDAO.findById(quoteId)
    : await generatePricingQuote({
        designId: designId || null,
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
        units: 200,
        processTimelinesVersion: 0,
        processesVersion: 0,
        productMaterialsVersion: 0,
        productTypeVersion: 0,
        marginVersion: 0,
        constantsVersion: 0,
        careLabelsVersion: 0
      });

  if (!quote) {
    throw new Error('Could not find or create quote for new pricing bid');
  }

  const bid = await createBid({
    acceptedAt: null,
    bidPriceCents: 100000,
    projectDueInMs: daysToMs(10),
    createdAt: new Date(),
    createdBy,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: [],
    ...bidOptions
  });

  return { bid, quote, user };
}
