import uuid from "node-uuid";
import Knex from "knex";

import * as CollectionsDAO from ".";
import * as DesignEventsDAO from "../../../dao/design-events";
import ProductDesignsDAO from "../../product-designs/dao";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import ProductDesign = require("../../product-designs/domain-objects/product-design");
import createDesign from "../../../services/create-design";
import generateCollection from "../../../test-helpers/factories/collection";
import DesignEvent from "../../../domain-objects/design-event";
import generateCollaborator from "../../../test-helpers/factories/collaborator";
import generatePricingValues from "../../../test-helpers/factories/pricing-values";
import generatePricingCostInput from "../../../test-helpers/factories/pricing-cost-input";
import db from "../../../services/db";
import { NotificationType } from "../../notifications/domain-object";
import generateNotification from "../../../test-helpers/factories/notification";
import * as NotificationAnnouncer from "../../iris/messages/notification";
import {
  addDesign,
  moveDesign,
  removeDesign,
} from "../../../test-helpers/collections";
import { deleteById } from "../../../test-helpers/designs";
import { generateDesign } from "../../../test-helpers/factories/product-design";

test("CollectionsDAO#create creates a collection", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const one = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
  });

  t.equal(one.title, "Drop 001/The Early Years");
  t.equal(one.description, "Initial commit");
  t.equal(one.createdBy, user.id);
  t.equal(one.deletedAt, null);
});

test("CollectionsDAO#update updates a collection", async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const createdCollection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
  });

  const updatedCollection = await CollectionsDAO.update(createdCollection.id, {
    ...createdCollection,
    description: "A New Hope",
  });

  t.deepEqual(updatedCollection.description, "A New Hope");
});

test("CollectionsDAO#findById does not find deleted collections", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  return db.transaction(async (trx: Knex.Transaction) => {
    const createdCollection = await CollectionsDAO.create({
      createdAt: new Date(),
      createdBy: user.id,
      deletedAt: null,
      description: "Initial commit",
      id: uuid.v4(),
      title: "Drop 001/The Early Years",
    });
    await CollectionsDAO.deleteById(trx, createdCollection.id);
    const retrievedCollection = await CollectionsDAO.findById(
      createdCollection.id,
      trx
    );
    t.equal(retrievedCollection, null, "deleted collection is not returned");
  });
});

test("CollectionsDAO#findByUserId includes referenced user collections", async (t: Test) => {
  const { user: user1 } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });

  const id1 = uuid.v4();
  const id2 = uuid.v4();

  await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user1.id,
    deletedAt: null,
    description: "Initial commit",
    id: id1,
    title: "Drop 001/The Early Years",
  });
  await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: "Another collection",
    id: id2,
    title: "Drop 002",
  });
  const retrievedCollection = await CollectionsDAO.findByUserId(user1.id);

  t.deepEqual(retrievedCollection[0].id, id1, "only my collection is returned");
});

test("CollectionsDAO#findByCollaboratorAndUserId finds all collections and searches", async (t: Test) => {
  const { user: user1 } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });

  const id1 = uuid.v4();
  const id2 = uuid.v4();
  const id3 = uuid.v4();

  const collection1 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user1.id,
    deletedAt: null,
    description: "Initial commit",
    id: id1,
    title: "Drop 001/The Early Years",
  });
  const collection2 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: "Another collection",
    id: id2,
    title: "Drop 002",
  });
  const collection3 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: "gucci gang gucci gang gucci gang",
    id: id3,
    title: "Drop 003",
  });
  const { collection: collection4 } = await generateCollection({
    createdBy: user2.id,
  });
  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user1.id,
  });
  await generateCollaborator({
    collectionId: collection2.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user1.id,
  });
  await generateCollaborator({
    cancelledAt: new Date("2018-04-20"),
    collectionId: collection3.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user1.id,
  });
  await generateCollaborator({
    collectionId: collection4.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user1.id,
  });

  return db.transaction(async (trx: Knex.Transaction) => {
    await CollectionsDAO.deleteById(trx, collection4.id);

    const collections = await CollectionsDAO.findByCollaboratorAndUserId(trx, {
      userId: user1.id,
    });

    t.deepEqual(
      collections,
      [collection2, collection1],
      "all collections I can access are returned"
    );

    const searchCollections = await CollectionsDAO.findByCollaboratorAndUserId(
      trx,
      {
        userId: user1.id,
        search: "Early yEars",
      }
    );

    t.deepEqual(
      searchCollections,
      [collection1],
      "Collections I searched for are returned"
    );

    const limitedOffsetCollections = await CollectionsDAO.findByCollaboratorAndUserId(
      trx,
      {
        userId: user1.id,
        limit: 1,
      }
    );

    t.equal(limitedOffsetCollections.length, 1);
  });
});

test("CollectionsDAO#addDesign adds a design to a collection", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const createdCollection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
  });
  const createdDesigns = await Promise.all([
    ProductDesignsDAO.create({
      productType: "HELMET",
      title: "Vader Mask",
      userId: user.id,
    }),
    ProductDesignsDAO.create({
      productType: "HELMET",
      title: "Stormtrooper Helmet",
      userId: user.id,
    }),
    ProductDesignsDAO.create({
      productType: "TEESHIRT",
      title: "Cat T-shirt",
      userId: user.id,
    }),
  ]);
  await addDesign(createdCollection.id, createdDesigns[0].id);
  const collectionDesigns = await addDesign(
    createdCollection.id,
    createdDesigns[1].id
  );

  t.deepEqual(
    collectionDesigns.map((design: ProductDesign) => design.id).sort(),
    createdDesigns
      .slice(0, 2)
      .map((design: ProductDesign) => design.id)
      .sort(),
    "returns only designs added to this collection"
  );
});

test("CollectionsDAO#moveDesign moves designs to different collections", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const createdCollectionOne = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: "Raf Raf Raf",
  });
  const createdCollectionTwo = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "2CoolForSkool",
    id: uuid.v4(),
    title: "Hypebeast",
  });
  const createdDesign = await ProductDesignsDAO.create({
    description: "Blade Runner x Raf",
    productType: "PARKA",
    title: "Raf Simons Replicant Parka",
    userId: user.id,
  });

  const collectionDesigns = await moveDesign(
    createdCollectionOne.id,
    createdDesign.id
  );

  t.deepEqual(
    collectionDesigns.map((design: ProductDesign) => design.id).sort(),
    [createdDesign.id],
    "ensure that the design was added to the collection"
  );

  const collectionDesignsTwo = await moveDesign(
    createdCollectionTwo.id,
    createdDesign.id
  );

  t.deepEqual(
    collectionDesignsTwo.map((design: ProductDesign) => design.id).sort(),
    [createdDesign.id],
    "ensure that the design was moved to a new collection"
  );
});

test("CollectionsDAO#removeDesign removes a design from a collection", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const createdCollection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: "Raf Raf Raf",
  });
  const createdDesign = await ProductDesignsDAO.create({
    description: "Black, bold, beautiful",
    productType: "HELMET",
    title: "Vader Mask",
    userId: user.id,
  });
  const collectionDesigns = await addDesign(
    createdCollection.id,
    createdDesign.id
  );
  const afterRemoveCollectionDesigns = await removeDesign(
    createdCollection.id,
    createdDesign.id
  );

  t.deepEqual(
    collectionDesigns,
    [
      {
        ...createdDesign,
        collectionIds: [createdCollection.id],
        collections: [
          { id: createdCollection.id, title: createdCollection.title },
        ],
      },
    ],
    "#add successfully adds the design"
  );
  t.deepEqual(
    afterRemoveCollectionDesigns,
    [],
    "#remove successfully removes the design"
  );
});

test("findSubmittedButUnpaidCollections finds all submitted but unpaid collections", async (t: Test) => {
  const { user } = await createUser({ role: "ADMIN" });
  const { user: user2 } = await createUser();

  const design1 = await createDesign({
    productType: "test",
    title: "test design uncosted",
    userId: user2.id,
  });

  const designDeleted = await createDesign({
    productType: "test",
    title: "test design uncosted",
    userId: user2.id,
  });

  const designDeleted2 = await createDesign({
    productType: "test",
    title: "test design uncosted",
    userId: user2.id,
  });

  const design2 = await createDesign({
    productType: "test2",
    title: "test design costed",
    userId: user2.id,
  });

  const design3 = await createDesign({
    productType: "test3",
    title: "test design costed",
    userId: user2.id,
  });

  const design4 = await createDesign({
    productType: "test3",
    title: "test design costed",
    userId: user2.id,
  });

  const design5 = await createDesign({
    productType: "test4",
    title: "test design costed and moved",
    userId: user2.id,
  });

  const { collection: collection1 } = await generateCollection({
    createdBy: user2.id,
  });
  const { collection: collectionDeleted } = await generateCollection({
    createdBy: user2.id,
  });
  const { collection: collection2 } = await generateCollection({
    createdBy: user2.id,
  });
  const { collection: collection3 } = await generateCollection({
    createdBy: user2.id,
    deletedAt: new Date(),
  });
  const { collection: collection4 } = await generateCollection({
    createdBy: user2.id,
  });
  const { collection: collection5 } = await generateCollection({
    createdBy: user2.id,
  });
  await generateCollection({ createdBy: user2.id });

  await addDesign(collection1.id, design1.id);
  await addDesign(collection1.id, design2.id);
  await addDesign(collection1.id, designDeleted2.id);
  await addDesign(collectionDeleted.id, designDeleted.id);
  await addDesign(collection2.id, design3.id);
  await addDesign(collection3.id, design4.id);
  await addDesign(collection4.id, design5.id);

  const submitEvent: DesignEvent = {
    actorId: user2.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(),
    designId: design1.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: user.id,
    type: "SUBMIT_DESIGN",
  };
  const submitEventDeleted: DesignEvent = {
    actorId: user2.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(),
    designId: designDeleted.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: user.id,
    type: "SUBMIT_DESIGN",
  };
  const submitEventDeleted2: DesignEvent = {
    actorId: user2.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(),
    designId: designDeleted.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: user.id,
    type: "SUBMIT_DESIGN",
  };
  const submitEvent2: DesignEvent = {
    actorId: user2.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(),
    designId: design2.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: user.id,
    type: "SUBMIT_DESIGN",
  };
  const submitEvent3: DesignEvent = {
    actorId: user2.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(2012, 1, 1),
    designId: design3.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: user.id,
    type: "SUBMIT_DESIGN",
  };
  const submitEvent4: DesignEvent = {
    actorId: user2.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(2012, 1, 1),
    designId: design4.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: user.id,
    type: "SUBMIT_DESIGN",
  };
  const submitEvent5: DesignEvent = {
    actorId: user2.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(2012, 1, 1),
    designId: design5.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: user.id,
    type: "SUBMIT_DESIGN",
  };
  const paymentEvent1: DesignEvent = {
    actorId: user.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(),
    designId: design2.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: user2.id,
    type: "COMMIT_QUOTE",
  };
  const paymentEvent2: DesignEvent = {
    actorId: user.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(),
    designId: design3.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: user2.id,
    type: "COMMIT_QUOTE",
  };
  const paymentEvent3: DesignEvent = {
    actorId: user.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(),
    designId: design4.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: user2.id,
    type: "COMMIT_QUOTE",
  };
  const paymentEvent4: DesignEvent = {
    actorId: user.id,
    approvalStepId: null,
    approvalSubmissionId: null,
    bidId: null,
    commentId: null,
    createdAt: new Date(),
    designId: design5.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: user2.id,
    type: "COMMIT_QUOTE",
  };

  await DesignEventsDAO.createAll([
    submitEvent,
    submitEventDeleted,
    submitEventDeleted2,
    submitEvent2,
    submitEvent3,
    submitEvent4,
    submitEvent5,
  ]);

  await DesignEventsDAO.createAll([
    paymentEvent1,
    paymentEvent2,
    paymentEvent3,
    paymentEvent4,
  ]);

  await moveDesign(collection5.id, design5.id);

  await db.transaction(async (trx: Knex.Transaction) => {
    await DesignEventsDAO.create(trx, {
      actorId: user2.id,
      approvalStepId: null,
      approvalSubmissionId: null,
      bidId: null,
      commentId: null,
      createdAt: new Date(),
      designId: design5.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: user.id,
      type: "SUBMIT_DESIGN",
    });
  });

  await deleteById(designDeleted.id);
  const response = await CollectionsDAO.findSubmittedButUnpaidCollections();

  t.equal(response.length, 1, "Only one collection is returned");
  t.deepEqual(
    [{ ...response[0], createdAt: new Date(response[0].createdAt) }],
    [{ ...collection1, createdAt: new Date(collection1.createdAt) }],
    "returns Collection with uncosted designs"
  );
});

test("findAllUnnotifiedCollectionsWithExpiringCostInputs works on the empty case", async (t: Test) => {
  await generatePricingValues();

  const { design: d1 } = await generatePricingCostInput({
    expiresAt: null,
  });
  const { design: d2 } = await generatePricingCostInput({
    expiresAt: null,
  });
  const { collection: c1 } = await generateCollection();
  await moveDesign(c1.id, d1.id);
  await moveDesign(c1.id, d2.id);

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const results = await CollectionsDAO.findAllUnnotifiedCollectionsWithExpiringCostInputs(
        {
          time: new Date(),
          boundingHours: 48,
          notificationType: NotificationType.COSTING_EXPIRED,
          trx,
        }
      );
      t.deepEqual(results, []);
    }
  );
});

test("findAllUnnotifiedCollectionsWithExpiringCostInputs will returns all collections that have not been sent with a notification", async (t: Test) => {
  await generatePricingValues();

  const testDate = new Date("2019-04-20");
  const anHourAgo = new Date(testDate);
  anHourAgo.setHours(anHourAgo.getHours() - 1);
  const anHourFromNow = new Date(testDate);
  anHourFromNow.setHours(anHourFromNow.getHours() + 1);

  const { design: d1 } = await generatePricingCostInput({
    expiresAt: anHourAgo,
  });
  const { design: d2 } = await generatePricingCostInput({
    expiresAt: anHourFromNow,
  });
  const { collection: c1, createdBy: u1 } = await generateCollection();
  await moveDesign(c1.id, d1.id);
  await moveDesign(c1.id, d2.id);

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const results = await CollectionsDAO.findAllUnnotifiedCollectionsWithExpiringCostInputs(
        {
          time: testDate,
          boundingHours: 1,
          notificationType: NotificationType.COSTING_EXPIRED,
          trx,
        }
      );
      t.deepEqual(results, [
        {
          id: c1.id,
          createdBy: u1.id,
        },
      ]);
    }
  );
});

test("findAllUnnotifiedCollectionsWithExpiringCostInputs filters against expired/deleted cost inputs and collections", async (t: Test) => {
  await generatePricingValues();

  const testDate = new Date("2019-04-20");
  const threeHoursAgo = new Date(testDate);
  threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
  const anHourFromNow = new Date(testDate);
  anHourFromNow.setHours(anHourFromNow.getHours() + 1);

  const { design: d1 } = await generatePricingCostInput({
    expiresAt: threeHoursAgo,
  });
  const { design: d2 } = await generatePricingCostInput({
    expiresAt: anHourFromNow,
  });
  const { collection: c1 } = await generateCollection();
  const { collection: c2 } = await generateCollection();
  await moveDesign(c1.id, d1.id);
  await moveDesign(c2.id, d2.id);

  return db.transaction(async (trx: Knex.Transaction) => {
    await CollectionsDAO.deleteById(trx, c2.id);

    const results = await CollectionsDAO.findAllUnnotifiedCollectionsWithExpiringCostInputs(
      {
        time: testDate,
        boundingHours: 1,
        notificationType: NotificationType.COSTING_EXPIRED,
        trx,
      }
    );
    t.deepEqual(results, []);
  });
});

test("findAllUnnotifiedCollectionsWithExpiringCostInputs will filter for ones with notifications already sent", async (t: Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  await generatePricingValues();

  const testDate = new Date("2019-04-20");
  const { design: d1 } = await generatePricingCostInput({
    expiresAt: testDate,
  });
  const { design: d2 } = await generatePricingCostInput({
    expiresAt: testDate,
  });
  const { design: d3 } = await generatePricingCostInput({
    expiresAt: testDate,
  });
  const { collection: c1, createdBy: u1 } = await generateCollection();
  const { collection: c2, createdBy: u2 } = await generateCollection();
  await generateNotification({
    collectionId: c1.id,
    recipientUserId: u1.id,
    type: NotificationType.COSTING_EXPIRED,
  });
  await generateNotification({
    collectionId: c2.id,
    recipientUserId: u1.id,
    type: NotificationType.COSTING_EXPIRATION_TWO_DAYS,
  });
  await generateNotification({
    collectionId: c2.id,
    recipientUserId: u1.id,
    type: NotificationType.COSTING_EXPIRATION_ONE_WEEK,
  });
  await moveDesign(c1.id, d1.id);
  await moveDesign(c1.id, d2.id);
  await moveDesign(c2.id, d3.id);

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const results = await CollectionsDAO.findAllUnnotifiedCollectionsWithExpiringCostInputs(
        {
          time: testDate,
          boundingHours: 1,
          notificationType: NotificationType.COSTING_EXPIRED,
          trx,
        }
      );
      t.deepEqual(results, [
        {
          id: c2.id,
          createdBy: u2.id,
        },
      ]);
    }
  );
});

test("hasOwnership", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({ createdBy: user.id });
  const d1 = await generateDesign({ userId: user.id });
  const d2 = await generateDesign({ userId: user2.id });
  const d3 = await generateDesign({ userId: user.id });
  await moveDesign(c1.id, d1.id);

  const result1 = await CollectionsDAO.hasOwnership({
    designId: d1.id,
    userId: user.id,
  });
  t.true(result1, "is an owner of a parent collection");

  const result2 = await CollectionsDAO.hasOwnership({
    designId: d2.id,
    userId: user.id,
  });
  t.false(result2, "is not an owner of a parent collection.");

  const result3 = await CollectionsDAO.hasOwnership({
    designId: d3.id,
    userId: user.id,
  });
  t.false(
    result3,
    "is not an owner of a parent collection (even though owner of design)."
  );
});
