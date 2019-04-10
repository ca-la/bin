import * as uuid from 'node-uuid';
import { test, Test } from '../../test-helpers/fresh';
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import generatePricingQuote from '../../services/generate-pricing-quote';
import createUser = require('../../test-helpers/create-user');
import { createAll as createDesignEvents } from '../../dao/design-events';
import { create as createDesign } from '../../dao/product-designs';

import Bid from './domain-object';
import {
  create,
  findAcceptedByTargetId,
  findAll,
  findById,
  findByQuoteId,
  findOpenByTargetId,
  findRejectedByTargetId
} from './dao';
import DesignEvent from '../../domain-objects/design-event';
import generateBid from '../../test-helpers/factories/bid';
import generateDesignEvent from '../../test-helpers/factories/design-event';

test('Bids DAO supports creation and retrieval', async (t: Test) => {
  await generatePricingValues();
  const { user } = await createUser();
  const quote = await generatePricingQuote({
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
  });
  const inputBid: Bid = {
    bidPriceCents: 100000,
    createdAt: new Date(2012, 11, 22),
    createdBy: user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  };
  const bid = await create(inputBid);
  const retrieved = await findById(inputBid.id);

  t.deepEqual(inputBid, bid);
  t.deepEqual(bid, retrieved);
});

test('Bids DAO findById returns null with a lookup-miss', async (t: Test) => {
  const missed = await findById(uuid.v4());

  t.equal(missed, null);
});

test('Bids DAO supports retrieval by quote ID', async (t: Test) => {
  await generatePricingValues();
  const { user } = await createUser();
  const quote = await generatePricingQuote({
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
  });
  const inputBid: Bid = {
    bidPriceCents: 100000,
    createdAt: new Date(2012, 11, 22),
    createdBy: user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  };
  await create(inputBid);
  const bids = await findByQuoteId(quote.id);

  t.deepEqual(bids, [inputBid], 'returns the bids in createdAt order');
});

test('Bids DAO supports retrieval of bids by target ID and status', async (t: Test) => {
  await generatePricingValues();
  const { user: designer } = await createUser();
  const { user: admin } = await createUser();
  const { user: partner } = await createUser();
  const { user: otherPartner } = await createUser();

  const quote = await generatePricingQuote({
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
  });
  const openBid: Bid = {
    bidPriceCents: 100000,
    createdAt: new Date(2012, 11, 22),
    createdBy: admin.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  };
  const rejectedBid: Bid = {
    bidPriceCents: 100000,
    createdAt: new Date(2012, 11, 22),
    createdBy: admin.id,
    description: 'Full Service (Rejected)',
    id: uuid.v4(),
    quoteId: quote.id
  };
  const acceptedBid: Bid = {
    bidPriceCents: 110000,
    createdAt: new Date(2012, 11, 26),
    createdBy: admin.id,
    description: 'Full Service (Accepted)',
    id: uuid.v4(),
    quoteId: quote.id
  };
  const design = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A design',
    userId: designer.id
  });
  const rejectedDesign = await createDesign({
    previewImageUrls: [],
    productType: 'A product type',
    title: 'A rejected design',
    userId: designer.id
  });

  const submitEvent: DesignEvent = {
    actorId: designer.id,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    type: 'SUBMIT_DESIGN'
  };

  const bidEvent: DesignEvent = {
    actorId: admin.id,
    bidId: openBid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: 'BID_DESIGN'
  };
  const bidToOtherEvent: DesignEvent = {
    actorId: admin.id,
    bidId: openBid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: otherPartner.id,
    type: 'BID_DESIGN'
  };
  const bidDesignToRejectEvent: DesignEvent = {
    actorId: admin.id,
    bidId: rejectedBid.id,
    createdAt: new Date(2012, 11, 24),
    designId: rejectedDesign.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: 'BID_DESIGN'
  };
  const bidDesignToAcceptEvent: DesignEvent = {
    actorId: admin.id,
    bidId: acceptedBid.id,
    createdAt: new Date(2012, 11, 24),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: partner.id,
    type: 'BID_DESIGN'
  };

  const rejectDesignEvent: DesignEvent = {
    actorId: partner.id,
    bidId: rejectedBid.id,
    createdAt: new Date(2012, 11, 25),
    designId: rejectedDesign.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    type: 'REJECT_SERVICE_BID'
  };
  const acceptDesignEvent: DesignEvent = {
    actorId: partner.id,
    bidId: acceptedBid.id,
    createdAt: new Date(2012, 11, 27),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    type: 'ACCEPT_SERVICE_BID'
  };
  const otherRejectEvent: DesignEvent = {
    actorId: otherPartner.id,
    bidId: openBid.id,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: null,
    type: 'REJECT_SERVICE_BID'
  };

  await create(openBid);
  await create(rejectedBid);
  await create(acceptedBid);
  await createDesignEvents([
    submitEvent,
    bidEvent,
    bidToOtherEvent,
    otherRejectEvent,
    bidDesignToRejectEvent,
    bidDesignToAcceptEvent,
    rejectDesignEvent,
    acceptDesignEvent
  ]);

  const openBids = await findOpenByTargetId(partner.id);
  const otherBids = await findOpenByTargetId(otherPartner.id);

  t.deepEqual(openBids, [openBid], 'returns non-rejected/accepted bid');
  t.deepEqual(otherBids, [], 'returns no bids');

  const acceptedBids = await findAcceptedByTargetId(partner.id);
  const otherAcceptedBids = await findAcceptedByTargetId(otherPartner.id);

  t.deepEqual(acceptedBids, [acceptedBid], 'returns accepted bid');
  t.deepEqual(otherAcceptedBids, [], 'returns no bids');

  const rejectedBids = await findRejectedByTargetId(partner.id);
  const otherRejectedBids = await findRejectedByTargetId(otherPartner.id);

  t.deepEqual(rejectedBids, [rejectedBid], 'returns rejected bid');
  t.deepEqual(otherRejectedBids, [openBid], 'returns rejected bid');
});

test('Bids DAO supports finding all with a limit and offset', async (t: Test) => {
  const { bid: bid1 } = await generateBid();
  const { bid: bid2 } = await generateBid({ generatePricing: false });
  const { bid: bid3 } = await generateBid({ generatePricing: false });
  const { bid: bid4 } = await generateBid({ generatePricing: false });
  const { bid: bid5 } = await generateBid({ generatePricing: false });

  const result1 = await findAll({});
  t.deepEqual(result1, [bid5, bid4, bid3, bid2, bid1], 'Returns all in desc order');

  const result2 = await findAll({ limit: 2 });
  t.deepEqual(result2, [bid5, bid4], 'Returns with a limit');

  const result3 = await findAll({ limit: 2, offset: 0 });
  t.deepEqual(result3, [bid5, bid4], 'Returns with a limit and offset');

  const result4 = await findAll({ limit: 3, offset: 2 });
  t.deepEqual(result4, [bid3, bid2, bid1], 'Returns with a limit and offset');
});

test('Bids DAO supports finding all bids by status', async (t: Test) => {
  const { bid: openBid1 } = await generateBid();
  await generateDesignEvent({
    bidId: openBid1.id,
    createdAt: new Date(),
    type: 'BID_DESIGN'
  });

  const { bid: acceptedBid } = await generateBid({ generatePricing: false });
  await generateDesignEvent({
    bidId: acceptedBid.id,
    createdAt: new Date(),
    type: 'BID_DESIGN'
  });
  await generateDesignEvent({
    bidId: acceptedBid.id,
    createdAt: new Date(),
    type: 'ACCEPT_SERVICE_BID'
  });
  const { bid: acceptedBid2 } = await generateBid({
    bidOptions: {
      createdAt: new Date('2019-01-15')
    },
    generatePricing: false
  });
  await generateDesignEvent({
    bidId: acceptedBid2.id,
    createdAt: new Date('2019-01-15'),
    type: 'BID_DESIGN'
  });
  await generateDesignEvent({
    bidId: acceptedBid2.id,
    createdAt: new Date('2019-01-16'),
    type: 'ACCEPT_SERVICE_BID'
  });

  const { bid: expiredBid } = await generateBid({
    bidOptions: {
      createdAt: new Date('2019-01-02')
    },
    generatePricing: false
  });
  await generateDesignEvent({
    bidId: expiredBid.id,
    createdAt: new Date('2019-01-02'),
    type: 'BID_DESIGN'
  });

  const { bid: rejectedBid } = await generateBid({
    bidOptions: {
      createdAt: new Date('2019-02-05')
    },
    generatePricing: false
  });
  await generateDesignEvent({
    bidId: rejectedBid.id,
    createdAt: new Date('2019-02-05'),
    type: 'BID_DESIGN'
  });
  await generateDesignEvent({
    bidId: rejectedBid.id,
    createdAt: new Date('2019-02-06'),
    type: 'REJECT_SERVICE_BID'
  });

  const result1 = await findAll({ state: 'OPEN' });
  t.deepEqual(result1, [openBid1], 'Only returns the open bids');

  const result2 = await findAll({ state: 'ACCEPTED' });
  t.deepEqual(result2, [acceptedBid, acceptedBid2], 'Only returns the accepted bids');

  const result2a = await findAll({ limit: 1, offset: 1, state: 'ACCEPTED' });
  t.deepEqual(result2a, [acceptedBid2], 'Only returns the accepted bids in the range');

  const result3 = await findAll({ state: 'EXPIRED' });
  t.deepEqual(result3, [expiredBid], 'Only returns the expired bids');

  const result4 = await findAll({ state: 'REJECTED' });
  t.deepEqual(result4, [rejectedBid], 'Only returns the rejected bids');
});
