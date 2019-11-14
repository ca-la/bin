import * as Fetch from '../../services/fetch';

import { sandbox, test, Test } from '../../test-helpers/fresh';
import attachSource from './attach-source';

test('attachSource calls the correct api', async (t: Test) => {
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
    .stub(Fetch, 'fetch')
    .resolves(fakeResponse);
  await attachSource({
    customerId: 'cus_123',
    cardToken: 'tok_123'
  });

  t.equal(fetchStub.callCount, 1);
  t.equal(
    fetchStub.firstCall.args[0],
    'https://api.stripe.com/v1/customers/cus_123/sources'
  );
  t.equal(fetchStub.firstCall.args[1].method, 'post');
  t.equal(fetchStub.firstCall.args[1].body, 'source=tok_123');
});
