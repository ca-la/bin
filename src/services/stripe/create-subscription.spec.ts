import * as fetch from 'node-fetch';

import { sandbox, test, Test } from '../../test-helpers/fresh';
import createSubscription from './create-subscription';

test('createSubscription calls the correct api', async (t: Test) => {
  const fakeResponse = {
    headers: {
      get(): string {
        return 'application/json';
      }
    },
    status: 200,
    json(): object {
      return {};
    }
  };

  const fetchStub = sandbox()
    .stub(fetch, 'default')
    .resolves(fakeResponse);
  await createSubscription({
    stripeCustomerId: 'cus_123',
    stripePlanId: 'plan_123',
    stripeSourceId: 'source_123'
  });

  t.equal(fetchStub.callCount, 1);
  t.equal(
    fetchStub.firstCall.args[0],
    'https://api.stripe.com/v1/subscriptions'
  );
  t.equal(fetchStub.firstCall.args[1].method, 'post');
  t.equal(
    fetchStub.firstCall.args[1].body,
    'items[0][plan]=plan_123&customer=cus_123&default_source=source_123'
  );
});
