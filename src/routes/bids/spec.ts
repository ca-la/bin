import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import { test, Test } from '../../test-helpers/fresh';
import { authHeader, del, get, put } from '../../test-helpers/http';
import createUser = require('../../test-helpers/create-user');
import generateBid from '../../test-helpers/factories/bid';
import { create as createDesign } from '../../dao/product-designs';
import { create as createBid } from '../../dao/bids';

test('GET /bids', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const partner = await createUser({ role: 'PARTNER' });
  const other = await createUser({ role: 'PARTNER' });
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: admin.user.id
  });

  const { bid, quote } = await generateBid(design.id, admin.user.id);
  const otherBid = await createBid({
    bidPriceCents: 100000,
    createdAt: new Date(2012, 12, 22),
    createdBy: admin.user.id,
    description: 'Full Service',
    id: uuid.v4(),
    quoteId: quote.id
  });

  await put(
    `/bids/${bid.id}/assignees/${partner.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  await put(
    `/bids/${otherBid.id}/assignees/${other.user.id}`,
    { headers: authHeader(admin.session.id) }
  );
  const [response, bids] = await get(
    `/bids?userId=${partner.user.id}`,
    { headers: authHeader(partner.session.id) }
  );
  t.equal(response.status, 200);
  t.deepEqual(bids, [{
    ...bid,
    createdAt: bid.createdAt.toISOString(),
    design: {
      ...design,
      createdAt: design.createdAt.toISOString()
    }
  }], 'returns only bids assigned to requested user');
});

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

test('GET /bids/:bidId/assignees', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const { user: partner } = await createUser({ role: 'PARTNER' });
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  const { bid } = await generateBid(design.id, user.id);

  await put(
    `/bids/${bid.id}/assignees/${partner.id}`,
    { headers: authHeader(session.id) }
  );

  const [response, assignees] = await get(
    `/bids/${bid.id}/assignees`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.deepEqual(assignees, [{
    ...omit(partner, ['passwordHash']),
    createdAt: partner.createdAt.toISOString()
  }]);
});

test('DELETE /bids/:bidId/assignees/:userId', async (t: Test) => {
  const { user, session } = await createUser({ role: 'ADMIN' });
  const { user: partner } = await createUser({ role: 'PARTNER' });
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  const { bid } = await generateBid(design.id, user.id);

  await put(
    `/bids/${bid.id}/assignees/${partner.id}`,
    { headers: authHeader(session.id) }
  );
  const [response] = await del(
    `/bids/${bid.id}/assignees/${partner.id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(response.status, 204);

  const assignees = await get(
    `/bids/${bid.id}/assignees`,
    { headers: authHeader(session.id) }
  );
  t.deepEqual(assignees[1], []);
});
