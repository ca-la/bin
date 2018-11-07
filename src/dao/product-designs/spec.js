'use strict';

const uuid = require('node-uuid');

const ProductDesignsDAO = require('./index');
const DesignEventsDAO = require('../design-events');
const { test } = require('../../test-helpers/fresh');
const createUser = require('../../test-helpers/create-user');

test('ProductDesignsDAO.create creates a design', (t) => {
  let userId;
  return createUser({ withSession: false })
    .then(({ user }) => {
      userId = user.id;
      return ProductDesignsDAO.create({
        title: 'Plain White Tee',
        productType: 'TEESHIRT',
        userId: user.id,
        previewImageUrls: [
          'abcd', 'efgh'
        ],
        metadata: {
          'dipped drawstrings': 'yes please'
        }
      });
    })
    .then((design) => {
      t.equal(design.userId, userId);
      t.equal(design.productType, 'TEESHIRT');
      t.deepEqual(design.metadata, {
        'dipped drawstrings': 'yes please'
      });
      t.deepEqual(design.previewImageUrls, [
        'abcd', 'efgh'
      ]);
      t.deepEqual(design.collectionIds, [], 'Collection IDs is empty');
    });
});

test('ProductDesignsDAO.update updates a design', (t) => {
  return createUser({ withSession: false })
    .then(({ user }) => {
      return ProductDesignsDAO.create({
        title: 'Plain White Tee',
        productType: 'TEESHIRT',
        userId: user.id
      });
    })
    .then((design) => {
      return ProductDesignsDAO.update(design.id, { title: 'Blue Tee' });
    })
    .then((updatedDesign) => {
      t.equal(updatedDesign.title, 'Blue Tee');
    });
});

test("ProductDesignsDAO.findById doesn't include deleted designs", async (t) => {
  const { user } = await createUser({ withSession: false });
  const { id } = await ProductDesignsDAO.create({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });

  await ProductDesignsDAO.deleteById(id);
  const design = await ProductDesignsDAO.findById(id);
  t.equal(design, null);
});

test('ProductDesignsDAO.findById includes deleted designs when specified', async (t) => {
  const { user } = await createUser({ withSession: false });
  const { id } = await ProductDesignsDAO.create({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });

  await ProductDesignsDAO.deleteById(id);
  const design = await ProductDesignsDAO.findById(id, null, { includeDeleted: true });
  t.equal(design.id, id);
});

test('ProductDesignsDAO.findByUserId', async (t) => {
  const { user } = await createUser({ withSession: false });
  const design = await ProductDesignsDAO.create({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });
  const userDesigns = await ProductDesignsDAO.findByUserId(user.id);

  t.deepEqual(userDesigns, [design]);
  t.ok(Object.keys(userDesigns[0]).includes('collectionIds'));
});


test('ProductDesignsDAO.findAll with needsQuote query', async (t) => {
  const { user } = await createUser({ withSession: false });
  const design = await ProductDesignsDAO.create({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });
  const submitEvent = {
    actorId: user.id,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    targetId: null,
    type: 'SUBMIT_DESIGN'
  };
  await DesignEventsDAO.create(submitEvent);

  const designsNeedQuote = await ProductDesignsDAO.findAll({
    limit: 10,
    offset: 0,
    needsQuote: true
  });
  t.deepEqual(designsNeedQuote, [design]);

  const bidEvent = {
    actorId: user.id,
    bidId: null,
    createdAt: new Date(2012, 11, 25),
    designId: design.id,
    id: uuid.v4(),
    targetId: user.id,
    type: 'BID_DESIGN'
  };
  await DesignEventsDAO.create(bidEvent);

  const needsQuote = await ProductDesignsDAO.findAll({
    limit: 10,
    offset: 0,
    needsQuote: true
  });
  t.deepEqual(needsQuote, []);
});
