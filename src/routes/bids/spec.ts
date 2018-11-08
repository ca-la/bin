import * as uuid from 'node-uuid';

import { test, Test } from '../../test-helpers/fresh';
import { authHeader, put } from '../../test-helpers/http';
import createUser = require('../../test-helpers/create-user');
import generateBid from '../../test-helpers/factories/bid';
import { create as createDesign } from '../../dao/product-designs';

test('PUT /bids/:bidId/assignees/:userId', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  const { bid } = await generateBid(design.id, user.id);

  const [response] = await put(
    `/bids/${bid.id}/assignees/${user.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(response.status, 204);

  const [notFoundUser] = await put(
    `/bids/${bid.id}/assignees/${uuid.v4()}`,
    { headers: authHeader(session.id) }
  );
  t.equal(notFoundUser.status, 404);

  const [notFoundBid] = await put(
    `/bids/${uuid.v4()}/assignees/${user.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(notFoundBid.status, 404);
});
