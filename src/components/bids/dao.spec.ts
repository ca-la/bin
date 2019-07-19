import * as uuid from 'node-uuid';
import { test, Test } from '../../test-helpers/fresh';
import generatePricingValues from '../../test-helpers/factories/pricing-values';
import generatePricingQuote from '../../services/generate-pricing-quote';
import createUser = require('../../test-helpers/create-user');
import { createAll as createDesignEvents } from '../../dao/design-events';
import { create as createDesign } from '../../dao/product-designs';

import { BidCreationPayload } from './domain-object';
import {
  create,
  findAcceptedByTargetId,
  findAll,
  findAllByQuoteAndUserId,
  findById,
  findByQuoteId,
  findOpenByTargetId,
  findRejectedByTargetId
} from './dao';
import DesignEvent from '../../domain-objects/design-event';
import generateBid from '../../test-helpers/factories/bid';
import generateDesignEvent from '../../test-helpers/factories/design-event';
import { daysToMs } from '../../services/time-conversion';

test('Bids DAO supports creation and retrieval', async (t: Test) => {
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
    projectDueInMs: daysToMs(10),
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
    projectDueInMs: daysToMs(10),
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
  const openBid: BidCreationPayload = {
    acceptedAt: null,
    bidPriceCents: 100000,
    projectDueInMs: daysToMs(10),
    createdAt: new Date(2012, 11, 22),
    createdBy: admin.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  };
  const rejectedBid: BidCreationPayload = {
    acceptedAt: null,
    bidPriceCents: 100000,
    projectDueInMs: daysToMs(10),
    createdAt: new Date(2012, 11, 22),
    createdBy: admin.id,
    description: 'Full Service (Rejected)',
    id: uuid.v4(),
    quoteId: quote.id
  };
  const acceptedBid: BidCreationPayload = {
    acceptedAt: null,
    bidPriceCents: 110000,
    projectDueInMs: daysToMs(10),
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

  t.deepEqual(
    acceptedBids,
    [{ ...acceptedBid, acceptedAt: acceptedBids[0].acceptedAt }],
    'returns accepted bid'
  );
  t.equal(
    (acceptedBids[0].createdAt as Date).toString(),
    new Date(2012, 11, 26).toString()
  );
  t.equal(
    (acceptedBids[0].acceptedAt as Date).toString(),
    new Date(2012, 11, 27).toString()
  );
  t.deepEqual(otherAcceptedBids, [], 'returns no bids');

  const rejectedBids = await findRejectedByTargetId(partner.id);
  const otherRejectedBids = await findRejectedByTargetId(otherPartner.id);

  t.deepEqual(rejectedBids, [rejectedBid], 'returns rejected bid');
  t.deepEqual(otherRejectedBids, [openBid], 'returns rejected bid');
});

test('findOpenByTargetId', async (t: Test) => {
  await generatePricingValues();
  const { user: admin } = await createUser();
  const { user: partner } = await createUser();

  const { bid: b1 } = await generateBid({
    generatePricing: false
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b1.id,
    targetId: partner.id,
    type: 'BID_DESIGN'
  });
  await generateDesignEvent({
    bidId: b1.id,
    targetId: partner.id,
    type: 'REMOVE_PARTNER'
  });
  const { bid: b2 } = await generateBid({
    generatePricing: false
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b2.id,
    targetId: partner.id,
    type: 'BID_DESIGN'
  });

  const openBids = await findOpenByTargetId(partner.id);
  t.deepEqual(openBids, [b2], 'Returns all open bids for the partner');
});

test('findAcceptedByTargetId', async (t: Test) => {
  await generatePricingValues();
  const { user: admin } = await createUser();
  const { user: partner } = await createUser();

  const { bid: b1 } = await generateBid({
    generatePricing: false
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b1.id,
    targetId: partner.id,
    type: 'BID_DESIGN'
  });
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b1.id,
    type: 'ACCEPT_SERVICE_BID'
  });
  await generateDesignEvent({
    bidId: b1.id,
    targetId: partner.id,
    type: 'REMOVE_PARTNER'
  });
  const { bid: b2 } = await generateBid({
    generatePricing: false
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b2.id,
    targetId: partner.id,
    type: 'BID_DESIGN'
  });
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b2.id,
    type: 'ACCEPT_SERVICE_BID'
  });

  const acceptedBids = await findAcceptedByTargetId(partner.id);
  t.deepEqual(
    acceptedBids,
    [{ ...b2, acceptedAt: acceptedBids[0].acceptedAt }],
    'Returns all accepted bids for the partner'
  );
});

test('findRejectedByTargetId', async (t: Test) => {
  await generatePricingValues();
  const { user: admin } = await createUser();
  const { user: partner } = await createUser();

  const { bid: b1 } = await generateBid({
    generatePricing: false
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b1.id,
    targetId: partner.id,
    type: 'BID_DESIGN'
  });
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b1.id,
    type: 'REJECT_SERVICE_BID'
  });
  await generateDesignEvent({
    bidId: b1.id,
    targetId: partner.id,
    type: 'REMOVE_PARTNER'
  });
  const { bid: b2 } = await generateBid({
    generatePricing: false
  });
  await generateDesignEvent({
    actorId: admin.id,
    bidId: b2.id,
    targetId: partner.id,
    type: 'BID_DESIGN'
  });
  await generateDesignEvent({
    actorId: partner.id,
    bidId: b2.id,
    type: 'REJECT_SERVICE_BID'
  });

  const rejectedBids = await findRejectedByTargetId(partner.id);
  t.deepEqual(rejectedBids, [b2], 'Returns all rejected bids for the partner');
});

test('Bids DAO supports finding all with a limit and offset', async (t: Test) => {
  const { bid: bid1 } = await generateBid();
  const { bid: bid2 } = await generateBid({ generatePricing: false });
  const { bid: bid3 } = await generateBid({ generatePricing: false });
  const { bid: bid4 } = await generateBid({ generatePricing: false });
  const { bid: bid5 } = await generateBid({ generatePricing: false });

  const result1 = await findAll({});
  t.deepEqual(
    result1,
    [bid5, bid4, bid3, bid2, bid1],
    'Returns all in desc order'
  );

  const result2 = await findAll({ limit: 2 });
  t.deepEqual(result2, [bid5, bid4], 'Returns with a limit');

  const result3 = await findAll({ limit: 2, offset: 0 });
  t.deepEqual(result3, [bid5, bid4], 'Returns with a limit and offset');

  const result4 = await findAll({ limit: 3, offset: 2 });
  t.deepEqual(result4, [bid3, bid2, bid1], 'Returns with a limit and offset');
});

test('Bids DAO supports finding all bids by status', async (t: Test) => {
  const now = new Date();
  const { bid: openBid1 } = await generateBid();
  await generateDesignEvent({
    bidId: openBid1.id,
    createdAt: now,
    type: 'BID_DESIGN'
  });
  const fiftyHoursAgo = new Date(now.setHours(now.getHours() - 50));
  const { bid: openBid2 } = await generateBid({
    bidOptions: {
      createdAt: fiftyHoursAgo
    },
    generatePricing: false
  });
  await generateDesignEvent({
    bidId: openBid2.id,
    createdAt: fiftyHoursAgo,
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
  t.deepEqual(result1, [openBid1, openBid2], 'Only returns the open bids');

  const result2 = await findAll({ state: 'ACCEPTED' });
  t.deepEqual(
    result2,
    [
      { ...acceptedBid, acceptedAt: result2[0].acceptedAt },
      { ...acceptedBid2, acceptedAt: result2[1].acceptedAt }
    ],
    'Only returns the accepted bids'
  );

  const result2a = await findAll({ limit: 1, offset: 1, state: 'ACCEPTED' });
  t.deepEqual(
    result2a,
    [{ ...acceptedBid2, acceptedAt: result2a[0].acceptedAt }],
    'Only returns the accepted bids in the range'
  );

  await generateDesignEvent({
    bidId: acceptedBid.id,
    type: 'REMOVE_PARTNER'
  });

  const result2b = await findAll({ state: 'ACCEPTED' });
  t.deepEqual(
    result2b,
    [{ ...acceptedBid2, acceptedAt: result2b[0].acceptedAt }],
    'Only returns the accepted bids that were not removed'
  );

  const result3 = await findAll({ state: 'EXPIRED' });
  t.deepEqual(result3, [expiredBid], 'Only returns the expired bids');

  const result4 = await findAll({ state: 'REJECTED' });
  t.deepEqual(result4, [rejectedBid], 'Only returns the rejected bids');
});

test('Bids DAO supports finding by quote and user id with events', async (t: Test) => {
  const { user: designer } = await createUser({ withSession: false });
  const { user: partner } = await createUser({
    role: 'PARTNER',
    withSession: false
  });

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'My cool shirt',
    userId: designer.id
  });
  const { bid: openBid1, quote } = await generateBid({
    designId: design.id
  });
  await generateDesignEvent({
    createdAt: new Date(),
    designId: design.id,
    targetId: designer.id,
    type: 'COMMIT_COST_INPUTS'
  });
  await generateDesignEvent({
    actorId: designer.id,
    createdAt: new Date(),
    designId: design.id,
    type: 'COMMIT_QUOTE'
  });
  const { designEvent: de1 } = await generateDesignEvent({
    bidId: openBid1.id,
    createdAt: new Date(),
    targetId: partner.id,
    type: 'BID_DESIGN'
  });
  const { designEvent: de2 } = await generateDesignEvent({
    actorId: partner.id,
    bidId: openBid1.id,
    createdAt: new Date(),
    type: 'ACCEPT_SERVICE_BID'
  });
  const { bid: openBid2 } = await generateBid({
    bidOptions: { quoteId: quote.id },
    generatePricing: false
  });
  await generateBid({ generatePricing: false });

  const result = await findAllByQuoteAndUserId(quote.id, partner.id);
  t.deepEqual(
    result,
    [
      {
        ...openBid2,
        acceptedAt: result[0].acceptedAt,
        designEvents: []
      },
      {
        ...openBid1,
        acceptedAt: result[1].acceptedAt,
        designEvents: [
          {
            ...de1,
            createdAt: new Date(de1.createdAt)
          },
          {
            ...de2,
            createdAt: new Date(de2.createdAt)
          }
        ]
      }
    ],
    'Returns a list of bids with bid-specific events'
  );
});
