'use strict';

const { range } = require('lodash');
const uuid = require('node-uuid');
const CollectionsDAO = require('./index');
const { test, sandbox } = require('../../test-helpers/fresh');
const createUser = require('../../test-helpers/create-user');

const id = uuid.v4();
const testDate = new Date(1996, 11, 25);

test('CollectionsDAO#create creates a collection', async (t) => {
  sandbox().stub(uuid, 'v4').returns(id);

  const { user } = await createUser({ withSession: false });
  const createdCollection = await CollectionsDAO.create({
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    createdBy: user.id,
    createdAt: testDate
  });

  t.deepEqual(createdCollection, {
    id,
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    deletedAt: null,
    createdBy: user.id,
    createdAt: testDate
  }, 'created collection equals retrieved collection');
});

test('CollectionsDAO#update updates a collection', async (t) => {
  sandbox().stub(uuid, 'v4').returns(id);

  const { user } = await createUser({ withSession: false });
  const createdCollection = await CollectionsDAO.create({
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    createdBy: user.id,
    createdAt: testDate
  });
  const updatedCollection = await CollectionsDAO.update(
    createdCollection.id,
    { description: 'A New Hope' }
  );

  t.deepEqual(updatedCollection, {
    id,
    title: 'Drop 001/The Early Years',
    description: 'A New Hope',
    deletedAt: null,
    createdBy: user.id,
    createdAt: testDate
  }, 'updated collection equals retrieved collection');
});

test('CollectionsDAO#findById does not find deleted collections', async (t) => {
  sandbox().stub(uuid, 'v4').returns(id);

  const { user } = await createUser({ withSession: false });
  const createdCollection = await CollectionsDAO.create({
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    createdBy: user.id,
    createdAt: testDate
  });
  await CollectionsDAO.deleteById(createdCollection.id);
  const retrievedCollection = await CollectionsDAO.findById(createdCollection.id);

  t.equal(retrievedCollection, null, 'deleted collection is not returned');
});

test('CollectionsDAO#findById includes deleted collections when specified', async (t) => {
  sandbox().stub(uuid, 'v4').returns(id);
  sandbox().useFakeTimers(testDate.getTime());

  const { user } = await createUser({ withSession: false });
  const createdCollection = await CollectionsDAO.create({
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    createdBy: user.id,
    createdAt: testDate
  });
  await CollectionsDAO.deleteById(createdCollection.id);
  const retrievedCollection = await CollectionsDAO.findById(
    createdCollection.id,
    null,
    { includeDeleted: true }
  );

  t.deepEqual(retrievedCollection, {
    id,
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    deletedAt: testDate,
    createdBy: user.id,
    createdAt: testDate
  }, 'deleted collection is returned');
});

test('CollectionsDAO#findByUserId only includes referenced user collections', async (t) => {
  const ids = range(4).map(() => uuid.v4());
  sandbox().stub(uuid, 'v4')
    .onCall(0)
      .returns(ids[0])
    .onCall(1)
      .returns(ids[1])
    .onCall(2)
      .returns(ids[2])
    .onCall(3)
      .returns(ids[3]);

  const { user: user1 } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });
  await CollectionsDAO.create({
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    createdBy: user1.id,
    createdAt: testDate
  });
  await CollectionsDAO.create({
    title: 'Lame Collection',
    description: 'What am I doing?',
    createdBy: user2.id,
    createdAt: testDate
  });
  const retrievedCollection = await CollectionsDAO.findByUserId(user1.id);

  t.deepEqual(retrievedCollection, [{
    id: ids[2],
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    deletedAt: null,
    createdBy: user1.id,
    createdAt: testDate
  }], 'only my collection is returned');
});

test('CollectionsDAO#findAll requires a limit and offset', (t) => {
  return CollectionsDAO.findAll({})
    .then(() => {
      t.fail('Collections were returned with no limit and offset specified');
    })
    .catch((error) => {
      t.equal(
        error.message,
        'Limit and offset must be provided to find all collections',
        'rejects with error when no limit or offset is called'
      );

      return Promise.resolve();
    });
});

test('CollectionsDAO#findAll returns all', async (t) => {
  const ids = range(5).map(() => uuid.v4());
  sandbox().stub(uuid, 'v4')
    .onCall(0)
      .returns(ids[0])
    .onCall(1)
      .returns(ids[1])
    .onCall(2)
    .returns(ids[2])
    .onCall(3)
      .returns(ids[3])
    .onCall(4)
      .returns(ids[4]);

  const { user: user1 } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });
  await CollectionsDAO.create({
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    createdBy: user1.id,
    createdAt: testDate
  });
  await CollectionsDAO.create({
    title: 'Lame Collection',
    description: 'What am I doing?',
    createdBy: user2.id,
    createdAt: testDate
  });
  await CollectionsDAO.create({
    title: 'Beyond the limit',
    description: 'Amaze',
    createdBy: user2.id,
    createdAt: testDate
  });
  const retrievedCollections = await CollectionsDAO.findAll({
    limit: 2,
    offset: 0
  });

  t.deepEqual(retrievedCollections, [{
    id: ids[2],
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    deletedAt: null,
    createdBy: user1.id,
    createdAt: testDate
  }, {
    id: ids[3],
    title: 'Lame Collection',
    description: 'What am I doing?',
    deletedAt: null,
    createdBy: user2.id,
    createdAt: testDate
  }], 'all collections are returned within the limit/offset');
});

test('CollectionsDAO#findAll returns search results', async (t) => {
  const ids = range(5).map(() => uuid.v4());
  sandbox().stub(uuid, 'v4')
    .onCall(0)
      .returns(ids[0])
    .onCall(1)
      .returns(ids[1])
    .onCall(2)
    .returns(ids[2])
    .onCall(3)
      .returns(ids[3])
    .onCall(4)
      .returns(ids[4]);

  const { user: user1 } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });
  await CollectionsDAO.create({
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    createdBy: user1.id,
    createdAt: testDate
  });
  await CollectionsDAO.create({
    title: 'Lame Collection',
    description: 'What am I doing?',
    createdBy: user2.id,
    createdAt: testDate
  });
  await CollectionsDAO.create({
    title: 'Beyond the limit',
    description: 'Wow',
    createdBy: user2.id,
    createdAt: testDate
  });
  const retrievedCollections = await CollectionsDAO.findAll({
    limit: 2,
    offset: 0,
    search: 'EARLY'
  });

  t.deepEqual(retrievedCollections, [{
    id: ids[2],
    title: 'Drop 001/The Early Years',
    description: 'Initial commit',
    deletedAt: null,
    createdBy: user1.id,
    createdAt: testDate
  }], 'finds collection that loosely matches search term');
});
