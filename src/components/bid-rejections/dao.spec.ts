import { test, Test } from '../../test-helpers/fresh';
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import createUser from '../../test-helpers/create-user';
import generatePricingQuote from '../../services/generate-pricing-quote';
import { BidCreationPayload } from '../bids/domain-object';
import { daysToMs } from '../../services/time-conversion';
import uuid = require('node-uuid');
import { create as createBid } from '../bids/dao';
import { create, findByBidId } from './dao';

test('Bid Rejections DAO supports creation and retrieval by Bid ID', async (t: Test) => {
  await generatePricingValues();
  const { user } = await createUser();
  const quote = await generatePricingQuote({
    designId: null,
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
  const inputBid: BidCreationPayload = {
    acceptedAt: null,
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdBy: user.id,
    completedAt: null,
    description: 'Full Service',
    dueDate: new Date(new Date(2012, 11, 22).getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    taskTypeIds: []
  };
  await createBid({ ...inputBid, acceptedAt: null, taskTypeIds: [] });

  const rejectionReasons = {
    id: uuid.v4(),
    createdAt: new Date(),
    createdBy: user.id,
    bidId: inputBid.id,
    priceTooLow: true,
    deadlineTooShort: false,
    missingInformation: false,
    other: true,
    notes: 'Material sourcing not possible'
  };
  const created = await create(rejectionReasons);
  const foundById = await findByBidId(rejectionReasons.bidId);
  t.deepEqual(rejectionReasons, created);
  t.deepEqual(rejectionReasons, foundById);
});
