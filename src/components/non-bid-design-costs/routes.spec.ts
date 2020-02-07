import * as uuid from 'node-uuid';

import createUser from '../../test-helpers/create-user';
import { authHeader, del, get, post } from '../../test-helpers/http';
import { test, Test } from '../../test-helpers/fresh';
import { generateDesign } from '../../test-helpers/factories/product-design';
import { Category } from './domain-object';

test('POST /non-bid-design-costs', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const designer = await createUser();
  const design = await generateDesign({ userId: designer.user.id });

  const [response, created] = await post('/non-bid-design-costs', {
    headers: authHeader(admin.session.id),
    body: {
      designId: design.id,
      cents: 30000,
      note: 'A note',
      category: Category.OTHER
    }
  });

  t.equal(response.status, 201);
  t.equal(created.createdBy, admin.user.id);
  t.equal(created.cents, 30000);
  t.equal(created.category, Category.OTHER);
  t.equal(created.note, 'A note');
  t.equal(created.designId, design.id);
  t.ok(created.id);
  t.ok(created.createdAt);
  t.equal(created.deletedAt, null);

  const [badRequest] = await post('/non-bid-design-costs', {
    headers: authHeader(admin.session.id),
    body: {
      cents: 30000,
      note: 'A note',
      category: Category.OTHER
    }
  });

  t.equal(badRequest.status, 400, 'rejects malformed requests');

  const [notAuthorized] = await post('/non-bid-design-costs', {
    headers: authHeader(designer.session.id),
    body: {
      designId: design.id,
      cents: 30000,
      note: 'A note',
      category: Category.OTHER
    }
  });

  t.equal(notAuthorized.status, 403, 'rejects non-admin users');
});

test('GET /non-bid-design-costs', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const designer = await createUser();
  const design = await generateDesign({ userId: designer.user.id });
  const anotherDesign = await generateDesign({ userId: designer.user.id });

  const [, zero] = await post('/non-bid-design-costs', {
    headers: authHeader(admin.session.id),
    body: {
      cents: 10000,
      category: Category.OTHER,
      note: 'A note',
      designId: design.id
    }
  });

  const [, one] = await post('/non-bid-design-costs', {
    headers: authHeader(admin.session.id),
    body: {
      cents: 30000,
      category: Category.BLANKS,
      note: 'So blank',
      designId: design.id
    }
  });

  const [, two] = await post('/non-bid-design-costs', {
    headers: authHeader(admin.session.id),
    body: {
      cents: 3000,
      category: Category.CUSTOM_PACKAGING,
      note: 'Glitter',
      designId: anotherDesign.id
    }
  });

  const [, byDesign] = await get(
    `/non-bid-design-costs?designId=${design.id}`,
    {
      headers: authHeader(admin.session.id)
    }
  );
  const [, byAnotherDesign] = await get(
    `/non-bid-design-costs?designId=${anotherDesign.id}`,
    {
      headers: authHeader(admin.session.id)
    }
  );

  t.deepEqual(byDesign, [zero, one], 'finds the costs by design');
  t.deepEqual(byAnotherDesign, [two], 'finds the costs by design');

  const [notAuthorized] = await get(
    `/non-bid-design-costs?designId=${anotherDesign.id}`,
    {
      headers: authHeader(designer.session.id)
    }
  );

  t.deepEqual(notAuthorized.status, 403, 'rejects non-admin users');

  const [noDesignSpecified] = await get('/non-bid-design-costs', {
    headers: authHeader(admin.session.id)
  });

  t.deepEqual(
    noDesignSpecified.status,
    400,
    'rejects requests with no design specified'
  );
});

test('DELETE /non-bid-design-costs', async (t: Test) => {
  const admin = await createUser({ role: 'ADMIN' });
  const designer = await createUser();
  const design = await generateDesign({ userId: designer.user.id });

  const [, zero] = await post('/non-bid-design-costs', {
    headers: authHeader(admin.session.id),
    body: {
      cents: 10000,
      category: Category.OTHER,
      note: 'A note',
      designId: design.id
    }
  });

  const [, one] = await post('/non-bid-design-costs', {
    headers: authHeader(admin.session.id),
    body: {
      cents: 30000,
      category: Category.BLANKS,
      note: 'So blank',
      designId: design.id
    }
  });

  const [deleteStatus] = await del(`/non-bid-design-costs/${one.id}`, {
    headers: authHeader(admin.session.id)
  });

  t.equal(deleteStatus.status, 204, 'delete succeeds');

  const [deleteAgainStatus] = await del(`/non-bid-design-costs/${one.id}`, {
    headers: authHeader(admin.session.id)
  });

  t.equal(deleteAgainStatus.status, 404, 'second delete returns 404');

  const [deleteNotFound] = await del(`/non-bid-design-costs/${uuid.v4()}`, {
    headers: authHeader(admin.session.id)
  });

  t.equal(deleteNotFound.status, 404);

  const [, byDesign] = await get(
    `/non-bid-design-costs?designId=${design.id}`,
    {
      headers: authHeader(admin.session.id)
    }
  );

  t.deepEqual(byDesign, [zero], 'removes cost from list by design');
});
