'use strict';

const CollectionsDAO = require('../../dao/collections');
const createUser = require('../../test-helpers/create-user');
const ProductDesignsDAO = require('../../dao/product-designs');
const {
  authHeader, del, post, get, patch, put
} = require('../../test-helpers/http');
const { test } = require('../../test-helpers/fresh');

function simulateAPISerialization(object) {
  return JSON.parse(JSON.stringify(object));
}

test('GET /collections/:id returns a created collection', async (t) => {
  const { session } = await createUser();
  const body = {
    title: 'Drop 001/The Early Years',
    description: 'Initial commit'
  };
  const [postResponse, postCollection] = await post(
    '/collections',
    { headers: authHeader(session.id), body }
  );
  const [getResponse, getCollection] = await get(
    `/collections/${postCollection.id}`,
    { headers: authHeader(session.id) }
  );

  t.equal(postResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(getResponse.status, 200, 'GET returns "200 OK" status');
  t.deepEqual(
    postCollection,
    getCollection,
    'return from POST is identical to GET'
  );
});

test('PATCH /collections/:collectionId allows updates to a collection', async (t) => {
  const { session } = await createUser();
  const body = {
    title: 'Drop 001/The Early Years',
    description: 'Initial commit'
  };
  const postResponse = await post(
    '/collections',
    { headers: authHeader(session.id), body }
  );

  const updateBody = { title: 'Droppin bombs' };
  const updateResponse = await patch(
    `/collections/${postResponse[1].id}`,
    { body: updateBody, headers: authHeader(session.id) }
  );
  t.deepEqual(
    updateResponse[1],
    { ...postResponse[1], title: updateBody.title },
    'PATCH updates the record'
  );
});

test('GET /collections', async (t) => {
  const { user, session } = await createUser();
  const { session: session2 } = await createUser();
  const mine = {
    title: 'Drop 001/The Early Years',
    description: 'Initial commit'
  };
  const theirs = {
    title: 'Nacho collection',
    description: 'Cheesy'
  };
  const [postResponse, myCollection] = await post(
    '/collections',
    { headers: authHeader(session.id), body: mine }
  );
  await post(
    '/collections',
    { headers: authHeader(session2.id), body: theirs }
  );

  const [getResponse, collections] = await get(
    `/collections?userId=${user.id}`,
    { headers: authHeader(session.id) }
  );
  const [forbiddenResponse] = await get(
    '/collections',
    { headers: authHeader(session.id) }
  );

  t.equal(postResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(getResponse.status, 200, 'GET returns "200 OK" status');
  t.equal(
    forbiddenResponse.status,
    403,
    'GET without user ID returns "403 Forbidden" status'
  );
  t.deepEqual(
    collections,
    [myCollection],
    'returns only collections created by me'
  );
});

test('DELETE /collections/:id', async (t) => {
  const { session } = await createUser();
  const { session: session2 } = await createUser();
  const mine = {
    title: 'Drop 001/The Early Years',
    description: 'Initial commit'
  };
  const theirs = {
    title: 'Nacho collection',
    description: 'Cheesy'
  };
  const [postResponse, postCollection] = await post(
    '/collections',
    { headers: authHeader(session.id), body: mine }
  );
  const [otherResponse, otherCollection] = await post(
    '/collections',
    { headers: authHeader(session2.id), body: theirs }
  );
  const [deleteResponse] = await del(
    `/collections/${postCollection.id}`,
    { headers: authHeader(session.id) }
  );
  const [failureResponse] = await del(
    `/collections/${otherCollection.id}`,
    { headers: authHeader(session.id) }
  );

  t.equal(postResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(deleteResponse.status, 200, 'DELETE returns "200 OK" status');

  t.equal(otherResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(failureResponse.status, 403, 'DELETE on unowned collection returns "403 Forbidden" status');
});

test('PUT /collections/:id/designs/:id', async (t) => {
  const { user, session } = await createUser();
  const collection = await post(
    '/collections',
    {
      headers: authHeader(session.id),
      body: {
        title: 'Drop 001/The Early Years',
        description: 'Initial commit'
      }
    }
  );
  const otherCollection = await post(
    '/collections',
    {
      headers: authHeader(session.id),
      body: {
        title: 'Drop 002/Empire Strikes Back',
        description: 'Ewoks'
      }
    }
  );
  const design = await post(
    '/product-designs',
    {
      headers: authHeader(session.id),
      body: {
        title: 'Vader Mask',
        description: 'Black, bold, beautiful',
        userId: user.id
      }
    }
  );
  const collectionDesigns = await put(
    `/collections/${collection[1].id}/designs/${design[1].id}`,
    { headers: authHeader(session.id) }
  );

  t.equal(
    collectionDesigns[1][0].id,
    design[1].id,
    'adds design to collection and returns all designs for collection'
  );

  const designInOtherCollection = await put(
    `/collections/${otherCollection[1].id}/designs/${design[1].id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(
    designInOtherCollection[1][0].id,
    design[1].id,
    'adding a design to a second collection moves it there'
  );
});

test('DELETE /collections/:id/designs/:id', async (t) => {
  const { user, session } = await createUser();
  const collection = await post(
    '/collections',
    {
      headers: authHeader(session.id),
      body: {
        title: 'Drop 001/The Early Years',
        description: 'Initial commit'
      }
    }
  );
  const design = await post(
    '/product-designs',
    {
      headers: authHeader(session.id),
      body: {
        title: 'Vader Mask',
        description: 'Black, bold, beautiful',
        userId: user.id
      }
    }
  );
  await put(
    `/collections/${collection[1].id}/designs/${design[1].id}`,
    { headers: authHeader(session.id) }
  );
  const collectionDesigns = await del(
    `/collections/${collection[1].id}/designs/${design[1].id}`,
    { headers: authHeader(session.id) }
  );

  t.deepEqual(
    collectionDesigns[1],
    [],
    'removes design from collection'
  );
});

test('GET /collections/:id/designs', async (t) => {
  const { user, session } = await createUser();

  const collection = await CollectionsDAO.create({
    createdBy: user.id,
    title: 'Drop 001/The Early Years',
    description: 'Initial commit'
  });

  const design = await ProductDesignsDAO.create({
    title: 'Vader Mask',
    description: 'Black, bold, beautiful',
    userId: user.id
  });

  await put(
    `/collections/${collection.id}/designs/${design.id}`,
    { headers: authHeader(session.id) }
  );

  const [_res, designs] = await get(
    `/collections/${collection.id}/designs`,
    { headers: authHeader(session.id) }
  );

  t.equal(designs.length, 1);

  t.deepEqual(
    designs[0],
    Object.assign(
      {},
      simulateAPISerialization(design),
      { collectionIds: [collection.id] }
    ),
    'returns a list of contained designs'
  );
});
