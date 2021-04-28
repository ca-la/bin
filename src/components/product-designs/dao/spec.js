"use strict";

const uuid = require("node-uuid");

const ProductDesignsDAO = require("./index");
const {
  default: generatePricingQuote,
} = require("../../../services/generate-pricing-quote");
const {
  default: generatePricingValues,
} = require("../../../test-helpers/factories/pricing-values");
const CollectionsDAO = require("../../collections/dao");
const DesignEventsDAO = require("../../design-events/dao");
const { test } = require("../../../test-helpers/fresh");
const createUser = require("../../../test-helpers/create-user");
const createDesign = require("../../../services/create-design").default;
const { moveDesign } = require("../../../test-helpers/collections");
const { deleteById } = require("../../../test-helpers/designs");
const db = require("../../../services/db");

test("ProductDesignsDAO.update updates a design", async (t) => {
  const { user } = await createUser({ withSession: false });
  const design = await createDesign({
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
  const { id } = await createDesign({
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
  const { id } = await createDesign({
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
  const design = await createDesign({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });
  const design2 = await createDesign({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });

  const result = await ProductDesignsDAO.findByIds([design.id, design2.id]);
  t.deepEqual(result, [design2, design]);
});

test("ProductDesignsDAO.findByUserId", async (t) => {
  const { user } = await createUser({ withSession: false });
  const design = await createDesign({
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
    teamId: null,
    title: "AW19",
  });
  const design = await createDesign({
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
  const design = await createDesign({
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
    targetTeamId: null,
    quoteId: null,
    approvalStepId: null,
    approvalSubmissionId: null,
    commentId: null,
    taskTypeId: null,
    shipmentTrackingId: null,
    shipmentTrackingEventId: null,
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
    targetTeamId: null,
    quoteId: null,
    approvalStepId: null,
    approvalSubmissionId: null,
    commentId: null,
    taskTypeId: null,
    shipmentTrackingId: null,
    shipmentTrackingEventId: null,
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
  const design = await createDesign({
    title: "Plain White Tee",
    productType: "TEESHIRT",
    userId: user.id,
  });
  await generatePricingValues();
  const quote = await generatePricingQuote(
    {
      createdAt: new Date(),
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
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
    },
    200
  );
  const retrieved = await db.transaction((trx) =>
    ProductDesignsDAO.findByQuoteId(trx, quote.id)
  );
  t.deepEqual(retrieved, design);
});
