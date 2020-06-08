import uuid from "node-uuid";
import sinon from "sinon";
import tape from "tape";
import Knex from "knex";

import * as CollectionsDAO from "../dao";
import * as CollaboratorsDAO from "../../collaborators/dao";
import * as BidsDAO from "../../bids/dao";
import * as PricingCostInputsDAO from "../../pricing-cost-inputs/dao";
import createUser from "../../../test-helpers/create-user";
import ProductDesignsDAO from "../../product-designs/dao";
import DesignEventsDAO from "../../design-events/dao";
import * as SubscriptionsDAO from "../../../components/subscriptions/dao";
import * as PaymentMethodsDAO from "../../../components/payment-methods/dao";
import * as PlansDAO from "../../../components/plans/dao";
import API from "../../../test-helpers/http";
import { sandbox, test } from "../../../test-helpers/fresh";
import * as CreateNotifications from "../../../services/create-notifications";
import * as DesignTasksService from "../../../services/create-design-tasks";
import { stubFetchUncostedWithLabels } from "../../../test-helpers/stubs/collections";
import Collection from "../domain-object";
import generateCollaborator from "../../../test-helpers/factories/collaborator";
import * as SubmissionStatusService from "../services/determine-submission-status";
import { moveDesign } from "../../../test-helpers/collections";
import db from "../../../services/db";
import generateApprovalStep from "../../../test-helpers/factories/design-approval-step";
import createDesign from "../../../services/create-design";
import DesignEvent, { DesignEventTypes } from "../../design-events/types";
import { taskTypes } from "../../tasks/templates/task-types";
import generatePricingValues from "../../../test-helpers/factories/pricing-values";
import { generateDesign } from "../../../test-helpers/factories/product-design";

test("GET /collections/:id returns a created collection", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const body = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
  };
  sandbox().stub(CollaboratorsDAO, "create").resolves({
    collectionId: uuid.v4(),
    id: uuid.v4(),
    role: "EDIT",
    userId: uuid.v4(),
  });

  const [postResponse, postCollection] = await API.post("/collections", {
    headers: API.authHeader(session.id),
    body,
  });
  const [getResponse, getCollection] = await API.get(
    `/collections/${postCollection.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(postResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(getResponse.status, 200, 'GET returns "200 OK" status');
  t.deepEqual(
    postCollection,
    getCollection,
    "return from POST is identical to GET"
  );
});

test("POST /collections/ without a full object can create a collection", async (t: tape.Test) => {
  const { session } = await createUser();
  const body = {
    createdAt: new Date(),
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
  };
  sandbox().stub(CollaboratorsDAO, "create").resolves({
    collectionId: uuid.v4(),
    id: uuid.v4(),
    role: "EDIT",
    userId: uuid.v4(),
  });

  const [postResponse, postCollection] = await API.post("/collections", {
    headers: API.authHeader(session.id),
    body,
  });
  const [getResponse, getCollection] = await API.get(
    `/collections/${postCollection.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(postResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(getResponse.status, 200, 'GET returns "200 OK" status');
  t.deepEqual(
    postCollection,
    getCollection,
    "return from POST is identical to GET"
  );
});

test("PATCH /collections/:collectionId allows updates to a collection", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const body = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
  };
  sandbox().stub(CollaboratorsDAO, "create").resolves({
    collectionId: uuid.v4(),
    id: uuid.v4(),
    role: "EDIT",
    userId: uuid.v4(),
  });

  const postResponse = await API.post("/collections", {
    headers: API.authHeader(session.id),
    body,
  });

  const updateBody = {
    createdAt: postResponse[1].createdAt,
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: postResponse[1].id,
    title: "Droppin bombs",
  };
  const updateResponse = await API.patch(`/collections/${postResponse[1].id}`, {
    body: updateBody,
    headers: API.authHeader(session.id),
  });
  t.deepEqual(
    updateResponse[1],
    { ...postResponse[1], title: updateBody.title },
    "PATCH updates the record"
  );
});

test("PATCH /collections/:collectionId supports partial updates to a collection", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const body = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
  };
  sandbox().stub(CollaboratorsDAO, "create").resolves({
    collectionId: uuid.v4(),
    id: uuid.v4(),
    role: "EDIT",
    userId: uuid.v4(),
  });

  const postResponse = await API.post("/collections", {
    headers: API.authHeader(session.id),
    body,
  });

  const updateBody = {
    description: "Updated Description",
    title: "Updated Title",
  };
  const updateResponse = await API.patch(`/collections/${postResponse[1].id}`, {
    body: updateBody,
    headers: API.authHeader(session.id),
  });
  t.deepEqual(
    updateResponse[1],
    {
      ...postResponse[1],
      description: updateBody.description,
      title: updateBody.title,
    },
    "PATCH updates the record"
  );
});

test("GET /collections", async (t: tape.Test) => {
  const { user, session } = await createUser();
  const { user: user2 } = await createUser();

  const collection1 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
  });
  const collection2 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: "Another collection",
    id: uuid.v4(),
    title: "Drop 002",
  });
  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: collection2.id,
    designId: null,
    invitationMessage: "",
    role: "VIEW",
    userEmail: null,
    userId: user.id,
  });

  const [getResponse, collections] = await API.get(
    `/collections?userId=${user.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );
  const [forbiddenResponse] = await API.get("/collections", {
    headers: API.authHeader(session.id),
  });

  t.equal(getResponse.status, 200, 'GET returns "200 OK" status');
  t.equal(
    forbiddenResponse.status,
    403,
    'GET without user ID returns "403 Forbidden" status'
  );
  t.deepEqual(
    collections,
    [
      {
        ...collection2,
        createdAt: collection2.createdAt.toISOString(),
        permissions: {
          canComment: true,
          canDelete: false,
          canEdit: false,
          canEditVariants: false,
          canSubmit: false,
          canView: true,
        },
      },
      {
        ...collection1,
        createdAt: collection1.createdAt.toISOString(),
        permissions: {
          canComment: true,
          canDelete: true,
          canEdit: true,
          canEditVariants: false,
          canSubmit: true,
          canView: true,
        },
      },
    ],
    "Returns all collections I have access to."
  );
});

test("DELETE /collections/:id", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const { session: session2, user: user2 } = await createUser();
  const mine = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
  };
  const theirs = {
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: "Cheesy",
    id: uuid.v4(),
    title: "Nacho collection",
  };
  sandbox().stub(CollaboratorsDAO, "create").resolves({
    collectionId: uuid.v4(),
    id: uuid.v4(),
    role: "EDIT",
    userId: uuid.v4(),
  });

  await API.post("/collections", {
    headers: API.authHeader(session.id),
    body: mine,
  });
  await API.post("/collections", {
    headers: API.authHeader(session2.id),
    body: theirs,
  });
  const designOne = await ProductDesignsDAO.create({
    description: "Generic Shirt",
    productType: "TEESHIRT",
    title: "T-Shirt One",
    userId: user.id,
  });
  const designTwo = await ProductDesignsDAO.create({
    description: "Generic Shirt",
    productType: "TEESHIRT",
    title: "T-Shirt Two",
    userId: user.id,
  });
  await moveDesign(mine.id, designOne.id);
  await moveDesign(mine.id, designTwo.id);
  const [deleteResponse] = await API.del(`/collections/${mine.id}`, {
    headers: API.authHeader(session.id),
  });
  const [failureResponse] = await API.del(`/collections/${theirs.id}`, {
    headers: API.authHeader(session.id),
  });

  t.equal(deleteResponse.status, 204, 'DELETE returns "204 No Content" status');
  t.equal(
    failureResponse.status,
    403,
    'DELETE on unowned collection returns "403 Forbidden" status'
  );

  const [, draftDesignOne] = await API.get(`/product-designs/${designOne.id}`, {
    headers: API.authHeader(session.id),
  });
  t.deepEqual(
    draftDesignOne.collectionIds,
    [],
    "Collection designs are removed from collection"
  );
  const [, draftDesignTwo] = await API.get(`/product-designs/${designTwo.id}`, {
    headers: API.authHeader(session.id),
  });
  t.deepEqual(
    draftDesignTwo.collectionIds,
    [],
    "Collection designs are removed from collection"
  );
});

test("POST /collections/:id/submissions", async (t: tape.Test) => {
  const owner = await createUser();
  const collaborator = await createUser();

  const plan = await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: "MONTHLY",
    monthlyCostCents: 4567,
    revenueSharePercentage: 50,
    stripePlanId: "plan_456",
    title: "Some More",
    isDefault: true,
    isPublic: false,
    ordering: null,
    description: null,
  });

  const paymentMethod = await PaymentMethodsDAO.create({
    userId: owner.user.id,
    stripeCustomerId: "customer1",
    stripeSourceId: "source1",
    lastFourDigits: "1234",
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: owner.user.id,
        isPaymentWaived: false,
      },
      trx
    );
    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: collaborator.user.id,
        isPaymentWaived: false,
      },
      trx
    );
  });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: owner.user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: collaborator.user.id,
  });
  const designOne = await ProductDesignsDAO.create({
    description: "Generic Shirt",
    productType: "TEESHIRT",
    title: "T-Shirt One",
    userId: owner.user.id,
  });
  const designTwo = await ProductDesignsDAO.create({
    description: "Generic Shirt",
    productType: "TEESHIRT",
    title: "T-Shirt Two",
    userId: owner.user.id,
  });

  const [approvalStepOne, approvalStepTwo] = await db.transaction(
    async (trx: Knex.Transaction) => {
      const { approvalStep: one } = await generateApprovalStep(trx, {
        designId: designOne.id,
      });
      const { approvalStep: two } = await generateApprovalStep(trx, {
        designId: designTwo.id,
      });
      return [one, two];
    }
  );

  await moveDesign(collection.id, designOne.id);
  await moveDesign(collection.id, designTwo.id);

  const notificationStub = sandbox()
    .stub(CreateNotifications, "sendDesignerSubmitCollection")
    .resolves();

  const serviceId = uuid.v4();
  const [response, body] = await API.post(
    `/collections/${collection.id}/submissions`,
    {
      body: {
        collectionId: collection.id,
        createdAt: new Date(),
        createdBy: owner.user.id,
        deletedAt: null,
        id: serviceId,
        needsDesignConsulting: true,
        needsFulfillment: true,
        needsPackaging: true,
      },
      headers: API.authHeader(owner.session.id),
    }
  );

  const [
    designOneEvents,
    designTwoEvents,
  ] = await db.transaction(async (trx: Knex.Transaction) => [
    await DesignEventsDAO.find(trx, { designId: designOne.id }),
    await DesignEventsDAO.find(trx, { designId: designTwo.id }),
  ]);

  sinon.assert.callCount(notificationStub, 1);

  t.deepEqual(response.status, 201, "Successfully posts");
  t.deepEqual(
    body,
    {
      collectionId: collection.id,
      isCosted: false,
      isPaired: false,
      isQuoted: false,
      isSubmitted: true,
      pricingExpiresAt: null,
    },
    "Returns current submission status"
  );
  t.deepEqual(
    designOneEvents[0].type,
    "SUBMIT_DESIGN",
    "Submitted the design to CALA"
  );
  t.deepEqual(
    designTwoEvents[0].type,
    "SUBMIT_DESIGN",
    "Submitted the design to CALA"
  );
  t.deepEqual(
    designOneEvents[0].approvalStepId,
    approvalStepOne.id,
    "Submission is associated with the right step"
  );
  t.deepEqual(
    designTwoEvents[0].approvalStepId,
    approvalStepTwo.id,
    "Submission is associated with the right step"
  );

  const collaboratorPost = await API.post(
    `/collections/${collection.id}/submissions`,
    {
      body: {
        collectionId: collection.id,
        createdAt: new Date(),
        createdBy: collaborator.user.id,
        deletedAt: null,
        id: serviceId,
        needsDesignConsulting: true,
        needsFulfillment: true,
        needsPackaging: true,
      },
      headers: API.authHeader(collaborator.session.id),
    }
  );

  t.equal(
    collaboratorPost[0].status,
    201,
    "Collaborators can submit collections"
  );

  const designThree = await createDesign({
    description: "Generic Shirt",
    productType: "TEESHIRT",
    title: "T-Shirt Two",
    userId: owner.user.id,
  });
  await moveDesign(collection.id, designThree.id);

  const secondSubmission = await API.post(
    `/collections/${collection.id}/submissions`,
    {
      body: {
        collectionId: collection.id,
        createdAt: new Date(),
        createdBy: owner.user.id,
        deletedAt: null,
        id: serviceId,
        needsDesignConsulting: true,
        needsFulfillment: true,
        needsPackaging: true,
      },
      headers: API.authHeader(owner.session.id),
    }
  );
  t.deepEqual(secondSubmission[0].status, 201, "Successfully posts");
  t.deepEqual(
    secondSubmission[1],
    {
      collectionId: collection.id,
      isCosted: false,
      isPaired: false,
      isQuoted: false,
      isSubmitted: true,
      pricingExpiresAt: null,
    },
    "Returns current submission status"
  );
});

test("GET /collections/:collectionId/submissions", async (t: tape.Test) => {
  const designer = await createUser();
  const rando = await createUser();
  const collectionId = uuid.v4();
  await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: designer.user.id,
    deletedAt: null,
    description: "Initial commit",
    id: collectionId,
    title: "Drop 001/The Early Years",
  });

  const statusStub = sandbox()
    .stub(SubmissionStatusService, "determineSubmissionStatus")
    .resolves({
      [collectionId]: {
        collectionId,
        isCosted: false,
        isPaired: false,
        isQuoted: false,
        isSubmitted: false,
        pricingExpiresAt: null,
      },
    });
  const statusOne = await API.get(`/collections/${collectionId}/submissions`, {
    headers: API.authHeader(designer.session.id),
  });
  t.equal(statusOne[0].status, 200);
  t.deepEqual(statusOne[1], {
    collectionId,
    isCosted: false,
    isPaired: false,
    isQuoted: false,
    isSubmitted: false,
    pricingExpiresAt: null,
  });

  statusStub.resolves({
    [collectionId]: {
      collectionId,
      isCosted: true,
      isPaired: false,
      isQuoted: false,
      isSubmitted: true,
      pricingExpiresAt: new Date("2019-04-20"),
    },
  });
  const statusTwo = await API.get(`/collections/${collectionId}/submissions`, {
    headers: API.authHeader(designer.session.id),
  });
  t.equal(statusTwo[0].status, 200);
  t.deepEqual(statusTwo[1], {
    collectionId,
    isCosted: true,
    isPaired: false,
    isQuoted: false,
    isSubmitted: true,
    pricingExpiresAt: new Date("2019-04-20").toISOString(),
  });

  const statusThree = await API.get(
    `/collections/${collectionId}/submissions`,
    {
      headers: API.authHeader(rando.session.id),
    }
  );
  t.equal(statusThree[0].status, 403);
});

test("POST /collections/:collectionId/cost-inputs", async (t: tape.Test) => {
  const designer = await createUser();
  const admin = await createUser({ role: "ADMIN" });

  const collectionOne = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: designer.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: "Yohji Yamamoto SS19",
  });
  const designOne = await generateDesign({
    description: "Oversize Placket Shirt",
    productType: "SHIRT",
    title: "Cozy Shirt",
    userId: designer.user.id,
  });
  const designTwo = await generateDesign({
    description: "Gabardine Wool Pant",
    productType: "PANT",
    title: "Balloon Pants",
    userId: designer.user.id,
  });
  await moveDesign(collectionOne.id, designOne.id);
  await moveDesign(collectionOne.id, designTwo.id);

  const notificationStub = sandbox()
    .stub(CreateNotifications, "immediatelySendFullyCostedCollection")
    .resolves();

  const failedPartnerPairing = await API.post(
    `/collections/${collectionOne.id}/cost-inputs`,
    { headers: API.authHeader(designer.session.id) }
  );
  t.equal(failedPartnerPairing[0].status, 403);

  const partnerPairing = await API.post(
    `/collections/${collectionOne.id}/cost-inputs`,
    { headers: API.authHeader(admin.session.id) }
  );
  t.equal(partnerPairing[0].status, 204);

  sinon.assert.called(notificationStub);

  const [
    designOneEvents,
    designTwoEvents,
  ] = await db.transaction(async (trx: Knex.Transaction) => [
    await DesignEventsDAO.find(trx, { designId: designOne.id }),
    await DesignEventsDAO.find(trx, { designId: designTwo.id }),
  ]);

  t.equal(designOneEvents.length, 1, "Creates one design event for the design");
  t.equal(
    designOneEvents[0].type,
    "COMMIT_COST_INPUTS",
    "Creates a cost input event"
  );
  t.equal(designTwoEvents.length, 1, "Creates one design event for the design");
  t.equal(
    designTwoEvents[0].type,
    "COMMIT_COST_INPUTS",
    "Creates a second cost input event"
  );
});

test("POST /collections/:collectionId/partner-pairings", async (t: tape.Test) => {
  await generatePricingValues();
  const designer = await createUser();
  const admin = await createUser({ role: "ADMIN" });
  const partner = await createUser({ role: "PARTNER" });

  const createDesignTasksStub = sandbox().stub(DesignTasksService, "default");
  const createNotificationsStub = sandbox()
    .stub(CreateNotifications, "immediatelySendPartnerPairingCommitted")
    .resolves();

  const collectionOne = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: designer.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: "Yohji Yamamoto SS19",
  });
  const designOne = await createDesign({
    description: "Oversize Placket Shirt",
    productType: "SHIRT",
    title: "Cozy Shirt",
    userId: designer.user.id,
  });
  const designTwo = await createDesign({
    description: "Gabardine Wool Pant",
    productType: "PANT",
    title: "Balloon Pants",
    userId: designer.user.id,
  });
  await moveDesign(collectionOne.id, designOne.id);
  await moveDesign(collectionOne.id, designTwo.id);
  await db.transaction(async (trx: Knex.Transaction) => {
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: designOne.id,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      processes: [],
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
    });
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: designTwo.id,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      processes: [],
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
    });
  });
  const [, designOneQuotes] = await API.post("/pricing-quotes", {
    body: [
      {
        designId: designOne.id,
        units: 300,
      },
    ],
    headers: API.authHeader(designer.session.id),
  });
  const [, designTwoQuotes] = await API.post("/pricing-quotes", {
    body: [
      {
        designId: designTwo.id,
        units: 300,
      },
    ],
    headers: API.authHeader(designer.session.id),
  });
  const bidOne = await BidsDAO.create({
    acceptedAt: null,
    bidPriceCents: 20000,
    bidPriceProductionOnlyCents: 0,
    createdBy: admin.user.id,
    completedAt: null,
    description: "Do me a favor, please.",
    dueDate: new Date(),
    id: uuid.v4(),
    quoteId: designOneQuotes[0].id,
    taskTypeIds: [taskTypes.TECHNICAL_DESIGN.id, taskTypes.PRODUCTION.id],
  });
  const bidTwo = await BidsDAO.create({
    acceptedAt: null,
    bidPriceCents: 20000,
    bidPriceProductionOnlyCents: 0,
    createdBy: admin.user.id,
    completedAt: null,
    description: "Do me a favor, please.",
    dueDate: new Date(),
    id: uuid.v4(),
    quoteId: designTwoQuotes[0].id,
    taskTypeIds: [taskTypes.TECHNICAL_DESIGN.id, taskTypes.PRODUCTION.id],
  });
  await API.put(`/bids/${bidOne.id}/assignees/${partner.user.id}`, {
    headers: API.authHeader(admin.session.id),
  });
  await API.put(`/bids/${bidTwo.id}/assignees/${partner.user.id}`, {
    headers: API.authHeader(admin.session.id),
  });

  await db.transaction((trx: Knex.Transaction) =>
    DesignEventsDAO.createAll(trx, [
      {
        actorId: partner.user.id,
        approvalStepId: null,
        approvalSubmissionId: null,
        bidId: bidOne.id,
        commentId: null,
        createdAt: new Date(),
        designId: designOne.id,
        id: uuid.v4(),
        quoteId: null,
        targetId: null,
        type: "ACCEPT_SERVICE_BID" as DesignEventTypes,
        taskTypeId: null,
      },
      {
        actorId: partner.user.id,
        approvalStepId: null,
        approvalSubmissionId: null,
        bidId: bidTwo.id,
        commentId: null,
        createdAt: new Date(),
        designId: designTwo.id,
        id: uuid.v4(),
        quoteId: null,
        targetId: null,
        type: "ACCEPT_SERVICE_BID" as DesignEventTypes,
        taskTypeId: null,
      },
    ])
  );

  const failedPartnerPairing = await API.post(
    `/collections/${collectionOne.id}/partner-pairings`,
    { headers: API.authHeader(designer.session.id) }
  );
  t.equal(failedPartnerPairing[0].status, 403);

  t.is(
    createDesignTasksStub.callCount,
    2,
    "Initial design task creation count"
  );
  createDesignTasksStub.resetHistory();

  const partnerPairing = await API.post(
    `/collections/${collectionOne.id}/partner-pairings`,
    { headers: API.authHeader(admin.session.id) }
  );
  t.equal(partnerPairing[0].status, 204, "Partner pairing should give 204");
  t.equal(
    createNotificationsStub.callCount,
    1,
    "Partner pairing notification is created"
  );

  const [
    designOneEvents,
    designTwoEvents,
  ] = await db.transaction(async (trx: Knex.Transaction) => [
    await DesignEventsDAO.find(trx, { designId: designOne.id }),
    await DesignEventsDAO.find(trx, { designId: designTwo.id }),
  ]);

  t.ok(
    designOneEvents.some(
      (de: DesignEvent) => de.type === "COMMIT_PARTNER_PAIRING"
    ),
    "Creates a design event for committing partner pairing"
  );
  t.ok(
    designTwoEvents.some(
      (de: DesignEvent) => de.type === "COMMIT_PARTNER_PAIRING"
    ),
    "Creates a design event for committing partner pairing"
  );

  t.is(
    createDesignTasksStub.callCount,
    2,
    "Post pairing tasks are generated for each design"
  );

  const collectionTwo = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: designer.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: "Yohji Yamamoto FW19",
  });
  const designThree = await createDesign({
    description: "Oversize Placket Shirt",
    productType: "SHIRT",
    title: "Cozy Shirt",
    userId: designer.user.id,
  });
  const designFour = await createDesign({
    description: "Gabardine Wool Pant",
    productType: "PANT",
    title: "Balloon Pants",
    userId: designer.user.id,
  });
  await moveDesign(collectionTwo.id, designThree.id);
  await moveDesign(collectionTwo.id, designFour.id);

  const notPairedFailure = await API.post(
    `/collections/${collectionTwo.id}/partner-pairings`,
    { headers: API.authHeader(admin.session.id) }
  );
  t.equal(notPairedFailure[0].status, 409);
});

test("GET /collections?isSubmitted=true&isCosted=false returns collections with uncosted designs", async (t: tape.Test) => {
  const { session: sessionAdmin } = await createUser({ role: "ADMIN" });
  const { session: sessionUser } = await createUser();

  const { collections } = stubFetchUncostedWithLabels();
  const [responseOk, bodyOk] = await API.get(
    "/collections?isSubmitted=true&isCosted=false",
    {
      headers: API.authHeader(sessionAdmin.id),
    }
  );

  t.equal(responseOk.status, 200, 'GET returns "200 OK" status');
  t.equal(bodyOk.length, 2, "2 collections are returned");
  const newTimeBody = bodyOk.map((el: Collection) => ({
    ...el,
    createdAt: new Date(el.createdAt),
  }));
  t.deepEqual(newTimeBody, collections, "collections match stub");

  const [responseBad] = await API.get(
    "/collections?isSubmitted=false&isCosted=false",
    {
      headers: API.authHeader(sessionUser.id),
    }
  );

  t.equal(
    responseBad.status,
    403,
    'GET returns "403 Permission Denied" status'
  );
});
