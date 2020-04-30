import daysToMs from '@cala/ts-lib/dist/time/days-to-ms';
import { sandbox, test, Test } from '../../../../test-helpers/fresh';
import generateBid from '../../../../test-helpers/factories/bid';
import { BidState, determineStateFromEvents } from './index';
import generateDesignEvent from '../../../../test-helpers/factories/design-event';

const now = new Date(2012, 11, 22);

test('determineStateFromEvents works for bids with no events', async (t: Test) => {
  sandbox().useFakeTimers(new Date(now.getTime() - daysToMs(4)));
  const { bid } = await generateBid();

  const result = determineStateFromEvents(bid, []);
  t.deepEqual(result, BidState.INITIAL, 'The bid is in an initial state');

  const { bid: bid2 } = await generateBid({
    generatePricing: false
  });

  sandbox().useFakeTimers(now);
  const result2 = determineStateFromEvents(bid2, []);
  t.deepEqual(result2, BidState.EXPIRED, 'The bid is expired');
});

test('determineStateFromEvents works for bids that have been bid out to', async (t: Test) => {
  sandbox().useFakeTimers(new Date(now.getTime() - daysToMs(4)));
  const { bid } = await generateBid();
  const { designEvent: e1 } = await generateDesignEvent({
    type: 'COMMIT_COST_INPUTS'
  });
  const { designEvent: e2 } = await generateDesignEvent({
    type: 'BID_DESIGN'
  });
  const { designEvent: e3 } = await generateDesignEvent({
    type: 'COMMIT_PARTNER_PAIRING'
  });

  const result = determineStateFromEvents(bid, [e1, e2, e3]);
  t.deepEqual(result, BidState.OPEN, 'The bid is in the open state');

  const { bid: bid2 } = await generateBid({
    generatePricing: false
  });

  sandbox().useFakeTimers(now);
  const result2 = determineStateFromEvents(bid2, [e1, e2, e3]);
  t.deepEqual(result2, BidState.EXPIRED, 'The bid is expired');
});

test('determineStateFromEvents works for bids that have been accepted', async (t: Test) => {
  sandbox().useFakeTimers(new Date(now.getTime() - daysToMs(4)));
  const { bid } = await generateBid();
  const { designEvent: e1 } = await generateDesignEvent({
    type: 'COMMIT_COST_INPUTS'
  });
  const { designEvent: e2 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'BID_DESIGN'
  });
  const { designEvent: e3 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'ACCEPT_SERVICE_BID',
    bidId: bid.id
  });

  const result = determineStateFromEvents(bid, [e1, e2, e3]);
  t.deepEqual(result, BidState.ACCEPTED, 'The bid is in the accepted state');

  sandbox().useFakeTimers(now);
  const { bid: bid2 } = await generateBid({
    generatePricing: false
  });

  const result2 = determineStateFromEvents(bid2, [e1, e2, e3]);
  t.deepEqual(
    result2,
    BidState.ACCEPTED,
    'The bid is accepted (even though it is old)'
  );
});

test('determineStateFromEvents works for bids that have been rejected', async (t: Test) => {
  sandbox().useFakeTimers(new Date(now.getTime() - daysToMs(4)));
  const { bid } = await generateBid();
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

  sandbox().useFakeTimers(now);
  const { bid: bid2 } = await generateBid({
    generatePricing: false
  });

  const result2 = determineStateFromEvents(bid2, [e1, e2]);
  t.deepEqual(
    result2,
    BidState.REJECTED,
    'The bid is rejected (even though it is old)'
  );
});

test('determineStateFromEvents works for bids where the partner was removed', async (t: Test) => {
  sandbox().useFakeTimers(new Date(now.getTime() - daysToMs(4)));
  const { bid } = await generateBid();
  const { designEvent: e1 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'BID_DESIGN'
  });
  const { designEvent: e2 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'ACCEPT_SERVICE_BID',
    bidId: bid.id
  });
  const { designEvent: e3 } = await generateDesignEvent({
    createdAt: new Date(),
    type: 'REMOVE_PARTNER'
  });

  sandbox().useFakeTimers(now);
  const result = determineStateFromEvents(bid, [e1, e2, e3]);
  t.deepEqual(result, BidState.REMOVED, 'The bid is in the removed state');

  const { bid: bid2 } = await generateBid({
    generatePricing: false
  });

  const result2 = determineStateFromEvents(bid2, [e1, e3]);
  t.deepEqual(
    result2,
    BidState.REMOVED,
    'The bid is removed (even though it is old)'
  );
});
