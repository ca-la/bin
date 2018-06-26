'use strict';

const createUser = require('../../test-helpers/create-user');
const { authHeader, del, post, get } = require('../../test-helpers/http');
const { test } = require('../../test-helpers/fresh');

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

test('POST /collections with missing data', async (t) => {
  const { session } = await createUser();
  const body = {
    title: 'Drop 001/The Early Years'
  };
  const [postResponse] = await post(
    '/collections',
    { headers: authHeader(session.id), body }
  );

  t.equal(postResponse.status, 400, 'POST returns "400 Bad Request" status');
});

test('GET /collections?userId=id', async (t) => {
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

  t.equal(postResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(getResponse.status, 200, 'GET returns "200 OK" status');
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
