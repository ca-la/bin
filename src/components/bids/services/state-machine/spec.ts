import { test, Test } from '../../../../test-helpers/fresh';
import generateBid from '../../../../test-helpers/factories/bid';
import { BidState, determineStateFromEvents } from './index';
import generateDesignEvent from '../../../../test-helpers/factories/design-event';

test('determineStateFromEvents works for bids with no events', async (t: Test) => {
  const { bid } = await generateBid({
    bidOptions: {
      createdAt: new Date()
    }
  });

  const result = determineStateFromEvents(bid, []);
  t.deepEqual(result, BidState.INITIAL, 'The bid is in an initial state');

  const { bid: bid2 } = await generateBid({
    bidOptions: {
      createdAt: new Date('2018-02-02')
    },
    generatePricing: false
  });

  const result2 = determineStateFromEvents(bid2, []);
  t.deepEqual(result2, BidState.EXPIRED, 'The bid is expired');
});

test('determineStateFromEvents works for bids that have been bid out to', async (t: Test) => {
  const { bid } = await generateBid({
    bidOptions: {
      createdAt: new Date()
    }
  });
  const { designEvent: e1 } = await generateDesignEvent({
    type: 'COMMIT_COST_INPUTS'
  });
  const { designEvent: e2 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'BID_DESIGN'
  });
  const { designEvent: e3 } = await generateDesignEvent({
    type: 'COMMIT_PARTNER_PAIRING'
  });

  const result = determineStateFromEvents(bid, [e1, e2, e3]);
  t.deepEqual(result, BidState.OPEN, 'The bid is in the open state');

  const { bid: bid2 } = await generateBid({
    bidOptions: {
      createdAt: new Date('2018-02-02')
    },
    generatePricing: false
  });

  const result2 = determineStateFromEvents(bid2, [e1, e2, e3]);
  t.deepEqual(result2, BidState.EXPIRED, 'The bid is expired');
});

test('determineStateFromEvents works for bids that have been accepted', async (t: Test) => {
  const { bid } = await generateBid({
    bidOptions: {
      createdAt: new Date()
    }
  });
  const { designEvent: e1 } = await generateDesignEvent({
    type: 'COMMIT_COST_INPUTS'
  });
  const { designEvent: e2 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'BID_DESIGN'
  });
  const { designEvent: e3 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'ACCEPT_SERVICE_BID'
  });

  const result = determineStateFromEvents(bid, [e1, e2, e3]);
  t.deepEqual(result, BidState.ACCEPTED, 'The bid is in the accepted state');

  const { bid: bid2 } = await generateBid({
    bidOptions: {
      createdAt: new Date('2018-02-02')
    },
    generatePricing: false
  });

  const result2 = determineStateFromEvents(bid2, [e1, e2, e3]);
  t.deepEqual(result2, BidState.ACCEPTED, 'The bid is accepted (even though it is old)');
});

test('determineStateFromEvents works for bids that have been rejected', async (t: Test) => {
  const { bid } = await generateBid({
    bidOptions: {
      createdAt: new Date()
    }
  });
  const { designEvent: e1 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'BID_DESIGN'
  });
  const { designEvent: e2 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'REJECT_SERVICE_BID'
  });

  const result = determineStateFromEvents(bid, [e1, e2]);
  t.deepEqual(result, BidState.REJECTED, 'The bid is in the rejected state');

  const { bid: bid2 } = await generateBid({
    bidOptions: {
      createdAt: new Date('2018-02-02')
    },
    generatePricing: false
  });

  const result2 = determineStateFromEvents(bid2, [e1, e2]);
  t.deepEqual(result2, BidState.REJECTED, 'The bid is rejected (even though it is old)');
});

test('determineStateFromEvents works for bids that have been rejected', async (t: Test) => {
  const { bid } = await generateBid({
    bidOptions: {
      createdAt: new Date()
    }
  });
  const { designEvent: e1 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'BID_DESIGN'
  });
  const { designEvent: e2 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'ACCEPT_SERVICE_BID'
  });
  const { designEvent: e3 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'REMOVE_PARTNER'
  });

  const result = determineStateFromEvents(bid, [e1, e2, e3]);
  t.deepEqual(result, BidState.REMOVED, 'The bid is in the removed state');

  const { bid: bid2 } = await generateBid({
    bidOptions: {
      createdAt: new Date('2018-02-02')
    },
    generatePricing: false
  });

  const result2 = determineStateFromEvents(bid2, [e1, e3]);
  t.deepEqual(result2, BidState.REMOVED, 'The bid is removed (even though it is old)');
});
