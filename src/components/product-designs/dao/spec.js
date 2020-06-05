"use strict";

const uuid = require("node-uuid");

const ProductDesignsDAO = require("./index");
const {
  default: generatePricingQuote,
} = require("../../../services/generate-pricing-quote");
const {
  default: generateCanvas,
} = require("../../../test-helpers/factories/product-design-canvas");
const {
  default: generateComponent,
} = require("../../../test-helpers/factories/component");
const {
  default: generateAsset,
} = require("../../../test-helpers/factories/asset");
const {
  default: generatePricingValues,
} = require("../../../test-helpers/factories/pricing-values");
const CollectionsDAO = require("../../collections/dao");
const DesignEventsDAO = require("../../../components/design-events/dao");
const { test } = require("../../../test-helpers/fresh");
const createUser = require("../../../test-helpers/create-user");
const { moveDesign } = require("../../../test-helpers/collections");
const { deleteById } = require("../../../test-helpers/designs");
const db = require("../../../services/db");

test("ProductDesignsDAO.create creates a design", async (t) => {
  const { user } = await createUser({ withSession: false });
  const forCreation = {
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
    previewImageUrls: ["abcd", "efgh"],
    metadata: {
      "dipped drawstrings": "yes please",
    },
  };
  const design = await ProductDesignsDAO.create(forCreation);
  const { asset: image1 } = await generateAsset();
  const { component: c1 } = await generateComponent({ sketchId: image1.id });
  await generateCanvas({
    createdBy: user.id,
    designId: design.id,
    componentId: c1.id,
    ordering: 1,
  });
  const { asset: image2 } = await generateAsset();
  const { component: c2 } = await generateComponent({ sketchId: image2.id });
  await generateCanvas({
    createdBy: user.id,
    designId: design.id,
    componentId: c2.id,
    ordering: 0,
  });

  const { asset: image3 } = await generateAsset();
  const { component: c3 } = await generateComponent({ sketchId: image3.id });
  await generateCanvas({
    createdBy: user.id,
    designId: design.id,
    componentId: c3.id,
    ordering: 3,
  });

  const { asset: image4 } = await generateAsset();
  const { component: c4 } = await generateComponent({ sketchId: image4.id });
  await generateCanvas({
    archivedAt: new Date(),
    createdBy: user.id,
    designId: design.id,
    componentId: c4.id,
    ordering: 2,
  });

  const returned = await ProductDesignsDAO.findById(design.id);

  t.deepEqual(
    returned,
    {
      ...forCreation,
      id: design.id,
      computedPricingTable: null,
      createdAt: design.createdAt,
      deletedAt: null,
      description: null,
      dueDate: null,
      expectedCostCents: null,
      imageIds: [image2.id, image1.id, image3.id],
      imageLinks: returned.imageLinks,
      previewImageUrls: returned.previewImageUrls,
      overridePricingTable: null,
      retailPriceCents: null,
      showPricingBreakdown: true,
      status: "DRAFT",
      collectionIds: [],
      collections: [],
      approvalSteps: null,
      progress: null,
    },
    "adds the collections and default/nullable values"
  );
});

test("ProductDesignsDAO.update updates a design", async (t) => {
  const { user } = await createUser({ withSession: false });
  const design = await ProductDesignsDAO.create({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });
  const updated = await ProductDesignsDAO.update(design.id, {
    title: "Blue Tee",
  });

  t.deepEqual(updated, { ...design, title: "Blue Tee" });
});

test("ProductDesignsDAO.findById doesn't include deleted designs", async (t) => {
  const { user } = await createUser({ withSession: false });
  const { id } = await ProductDesignsDAO.create({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });

  await deleteById(id);
  const design = await ProductDesignsDAO.findById(id);
  t.equal(design, null);
});

test("ProductDesignsDAO.findById includes deleted designs when specified", async (t) => {
  const { user } = await createUser({ withSession: false });
  const { id } = await ProductDesignsDAO.create({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });

  await deleteById(id);
  const design = await ProductDesignsDAO.findById(id, null, {
    includeDeleted: true,
  });
  t.equal(design.id, id);
});

test("ProductDesignsDAO.findByIds includes several designs", async (t) => {
  const { user } = await createUser({ withSession: false });
  const design = await ProductDesignsDAO.create({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });
  const design2 = await ProductDesignsDAO.create({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });

  const result = await ProductDesignsDAO.findByIds([design.id, design2.id]);
  t.deepEqual(result, [design2, design]);
});

test("ProductDesignsDAO.findByUserId", async (t) => {
  const { user } = await createUser({ withSession: false });
  const design = await ProductDesignsDAO.create({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });
  const userDesigns = await ProductDesignsDAO.findByUserId(user.id);

  t.deepEqual(userDesigns, [design]);
});

test("ProductDesignsDAO.findByCollectionId", async (t) => {
  const { user } = await createUser({ withSession: false });
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: "AW19",
  });
  const design = await ProductDesignsDAO.create({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });
  await moveDesign(collection.id, design.id);

  const collectionDesigns = await ProductDesignsDAO.findByCollectionId(
    collection.id
  );

  t.deepEqual(
    collectionDesigns,
    [
      {
        ...design,
        collectionIds: [collection.id],
        collections: [{ id: collection.id, title: collection.title }],
      },
    ],
    "Passes through the design associated with the collection"
  );
  t.deepEqual(
    collectionDesigns[0].previewImageUrls,
    [],
    "Passes through the preview image urls for each design"
  );
});

test("ProductDesignsDAO.findAll with needsQuote query", async (t) => {
  const { user } = await createUser({ withSession: false });
  const design = await ProductDesignsDAO.create({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });
  const submitEvent = {
    actorId: user.id,
    bidId: null,
    createdAt: new Date(2012, 11, 23),
    designId: design.id,
    id: uuid.v4(),
    targetId: null,
    type: "SUBMIT_DESIGN",
  };

  await db.transaction(async (trx) => {
    await DesignEventsDAO.create(trx, submitEvent);
  });

  const designsNeedQuote = await ProductDesignsDAO.findAll({
    limit: 10,
    offset: 0,
    needsQuote: true,
  });
  t.deepEqual(designsNeedQuote, [design]);

  const bidEvent = {
    actorId: user.id,
    bidId: null,
    createdAt: new Date(2012, 11, 25),
    designId: design.id,
    id: uuid.v4(),
    targetId: user.id,
    type: "BID_DESIGN",
  };

  await db.transaction(async (trx) => {
    await DesignEventsDAO.create(trx, bidEvent);
  });

  const needsQuote = await ProductDesignsDAO.findAll({
    limit: 10,
    offset: 0,
    needsQuote: true,
  });
  t.deepEqual(needsQuote, []);
});

test("ProductDesignsDAO.findByQuoteId", async (t) => {
  const { user } = await createUser({ withSession: false });
  const design = await ProductDesignsDAO.create({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });
  await generatePricingValues();
  const quote = await generatePricingQuote({
    designId: design.id,
    materialBudgetCents: 1200,
    materialCategory: "BASIC",
    processes: [
      {
        complexity: "1_COLOR",
        name: "SCREEN_PRINTING",
      },
      {
        complexity: "1_COLOR",
        name: "SCREEN_PRINTING",
      },
    ],
    productComplexity: "SIMPLE",
    productType: "TEESHIRT",
    units: 200,
  });
  const retrieved = await ProductDesignsDAO.findByQuoteId(quote.id);
  t.deepEqual(retrieved, design);
});
