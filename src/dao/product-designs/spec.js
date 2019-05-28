'use strict';

const uuid = require('node-uuid');

const ProductDesignsDAO = require('./index');
const {
  default: generatePricingQuote
} = require('../../services/generate-pricing-quote');
const {
  default: generatePricingValues
} = require('../../test-helpers/factories/pricing-values');
const CollectionsDAO = require('../collections');
const DesignEventsDAO = require('../design-events');
const { test } = require('../../test-helpers/fresh');
const createUser = require('../../test-helpers/create-user');

test('ProductDesignsDAO.create creates a design', async t => {
  const { user } = await createUser({ withSession: false });
  const forCreation = {
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id,
    previewImageUrls: ['abcd', 'efgh'],
    metadata: {
      'dipped drawstrings': 'yes please'
    }
  };
  const design = await ProductDesignsDAO.create(forCreation);

  t.deepEqual(
    design,
    {
      ...forCreation,
      id: design.id,
      computedPricingTable: null,
      createdAt: design.createdAt,
      deletedAt: null,
      description: null,
      dueDate: null,
      expectedCostCents: null,
      imageIds: [],
      imageLinks: [],
      previewImageUrls: [],
      overridePricingTable: null,
      retailPriceCents: null,
      showPricingBreakdown: true,
      status: 'DRAFT',
      collectionIds: [],
      collections: []
    },
    'adds the collections and default/nullable values'
  );
});

test('ProductDesignsDAO.update updates a design', async t => {
  const { user } = await createUser({ withSession: false });
  const design = await ProductDesignsDAO.create({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });
  const updated = await ProductDesignsDAO.update(design.id, {
    title: 'Blue Tee'
  });

  t.deepEqual(updated, { ...design, title: 'Blue Tee' });
});

test("ProductDesignsDAO.findById doesn't include deleted designs", async t => {
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

test('ProductDesignsDAO.findById includes deleted designs when specified', async t => {
  const { user } = await createUser({ withSession: false });
  const { id } = await ProductDesignsDAO.create({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });

  await ProductDesignsDAO.deleteById(id);
  const design = await ProductDesignsDAO.findById(id, null, {
    includeDeleted: true
  });
  t.equal(design.id, id);
});

test('ProductDesignsDAO.findByIds includes several designs', async t => {
  const { user } = await createUser({ withSession: false });
  const design = await ProductDesignsDAO.create({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });
  const design2 = await ProductDesignsDAO.create({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });

  const result = await ProductDesignsDAO.findByIds([design.id, design2.id]);
  t.deepEqual(result, [design2, design]);
});

test('ProductDesignsDAO.findByUserId', async t => {
  const { user } = await createUser({ withSession: false });
  const design = await ProductDesignsDAO.create({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });
  const userDesigns = await ProductDesignsDAO.findByUserId(user.id);

  t.deepEqual(userDesigns, [design]);
});

test('ProductDesignsDAO.findByCollectionId', async t => {
  const { user } = await createUser({ withSession: false });
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });
  const design = await ProductDesignsDAO.create({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });
  await CollectionsDAO.moveDesign(collection.id, design.id);

  const collectionDesigns = await ProductDesignsDAO.findByCollectionId(
    collection.id
  );

  t.deepEqual(
    collectionDesigns,
    [
      {
        ...design,
        collectionIds: [collection.id],
        collections: [{ id: collection.id, title: collection.title }]
      }
    ],
    'Passes through the design associated with the collection'
  );
  t.deepEqual(
    collectionDesigns[0].previewImageUrls,
    [],
    'Passes through the preview image urls for each design'
  );
});

test('ProductDesignsDAO.findAll with needsQuote query', async t => {
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

test('ProductDesignsDAO.findByQuoteId', async t => {
  const { user } = await createUser({ withSession: false });
  const design = await ProductDesignsDAO.create({
    title: 'Plain White Tee',
    productType: 'TEESHIRT',
    userId: user.id
  });
  await generatePricingValues();
  const quote = await generatePricingQuote({
    designId: design.id,
    materialBudgetCents: 1200,
    materialCategory: 'BASIC',
    processes: [
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      },
      {
        complexity: '1_COLOR',
        name: 'SCREEN_PRINTING'
      }
    ],
    productComplexity: 'SIMPLE',
    productType: 'TEESHIRT',
    units: 200
  });
  const retrieved = await ProductDesignsDAO.findByQuoteId(quote.id);
  t.deepEqual(retrieved, design);
});
