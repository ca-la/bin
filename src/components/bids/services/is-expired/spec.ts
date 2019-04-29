import { test, Test } from '../../../../test-helpers/fresh';

import { isExpired } from './index';
import generateBid from '../../../../test-helpers/factories/bid';

test('isExpired can determine if a bid is expired', async (t: Test) => {
  const { bid: bid1 } = await generateBid();
  const { bid: bid2 } = await generateBid({
    bidOptions: {
      createdAt: new Date('2019-02-01')
    },
    generatePricing: false
  });
  const now = new Date();
  const threeDaysAgo = new Date(now.setHours(now.getHours() - 72));
  const now2 = new Date();
  const seventyOneHoursAgo = new Date(now2.setHours(now2.getHours() - 71));
  const { bid: bid3 } = await generateBid({
    bidOptions: {
      createdAt: threeDaysAgo
    },
    generatePricing: false
  });
  const { bid: bid4 } = await generateBid({
    bidOptions: {
      createdAt: seventyOneHoursAgo
    },
    generatePricing: false
  });

  t.false(isExpired(bid1), 'Is not expired');
  t.true(isExpired(bid2), 'Is expired');
  t.true(isExpired(bid3), 'Is Expired');
  t.false(isExpired(bid4), 'Is not expired');
});
