import uuid from "node-uuid";
import sinon from "sinon";
import tape from "tape";
import Knex from "knex";

import * as CollectionsDAO from "../dao";
import * as CollaboratorsDAO from "../../collaborators/dao";
import createUser from "../../../test-helpers/create-user";
import DesignEventsDAO from "../../design-events/dao";
import * as SubscriptionsDAO from "../../subscriptions/dao";
import * as PaymentMethodsDAO from "../../payment-methods/dao";
import { BillingInterval } from "../../plans/types";
import generatePlan from "../../../test-helpers/factories/plan";
import { rawDao as RawTeamUsersDAO } from "../../team-users/dao";
import { Role as TeamUserRole } from "../../team-users/types";
import API from "../../../test-helpers/http";
import { sandbox, test } from "../../../test-helpers/fresh";
import * as CreateNotifications from "../../../services/create-notifications";
import { stubFetchUncostedWithLabels } from "../../../test-helpers/stubs/collections";
import CollectionDb from "../domain-object";
import generateCollaborator from "../../../test-helpers/factories/collaborator";
import * as SubmissionStatusService from "../services/determine-submission-status";
import { moveDesign } from "../../../test-helpers/collections";
import db from "../../../services/db";
import ApprovalStepsDAO from "../../approval-steps/dao";
import createDesign from "../../../services/create-design";
import { generateDesign } from "../../../test-helpers/factories/product-design";
import * as IrisService from "../../iris/send-message";
import { generateTeam } from "../../../test-helpers/factories/team";
import * as TeamsService from "../../teams/service";
import * as TeamUsersService from "../../team-users/service";
import { ApprovalStepType } from "../../approval-steps/types";

test("GET /collections/:id returns a created collection", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const { team } = await generateTeam(user.id);
  const body = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
    teamId: team.id,
  };
  sandbox().stub(TeamsService, "checkCollectionsLimit").resolves({
    isReached: false,
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
  const { session, user } = await createUser();
  const { team } = await generateTeam(user.id);

  const body = {
    createdAt: new Date(),
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
    teamId: team.id,
  };
  sandbox().stub(TeamsService, "checkCollectionsLimit").resolves({
    isReached: false,
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

test("POST /collections with a teamId", async (t: tape.Test) => {
  const { user, session } = await createUser();
  const { session: nonTeamUserSession } = await createUser();
  const { session: teamViewerSession } = await createUser();
  const { session: teamPartnerSession } = await createUser();
  const { team } = await generateTeam(user.id);
  await db.transaction(async (trx: Knex.Transaction) => {
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.VIEWER,
      label: null,
      teamId: team.id,
      userId: teamViewerSession.userId,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
    await RawTeamUsersDAO.create(trx, {
      id: uuid.v4(),
      role: TeamUserRole.TEAM_PARTNER,
      label: null,
      teamId: team.id,
      userId: teamPartnerSession.userId,
      userEmail: null,
      createdAt: new Date(),
      deletedAt: null,
      updatedAt: new Date(),
    });
  });
  const body = {
    createdAt: new Date(),
    description: null,
    id: uuid.v4(),
    teamId: team.id,
    title: "Drop 001/The Early Years",
  };
  sandbox().stub(TeamsService, "checkCollectionsLimit").resolves({
    isReached: false,
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

  const [forbidden] = await API.post("/collections", {
    headers: API.authHeader(nonTeamUserSession.id),
    body,
  });

  t.equal(
    forbidden.status,
    403,
    "Does not allow non team users to create collections"
  );

  const [viewerForbidden] = await API.post("/collections", {
    headers: API.authHeader(teamViewerSession.id),
    body,
  });

  t.equal(
    viewerForbidden.status,
    403,
    "Does not allow viewers to create collections"
  );

  const [partnerAllowed] = await API.post("/collections", {
    headers: API.authHeader(teamPartnerSession.id),
    body: {
      ...body,
      id: uuid.v4(),
    },
  });

  t.equal(
    partnerAllowed.status,
    201,
    "Allows team partners to create collections"
  );
});

test("POST /collections with an exceeded limit", async (t: tape.Test) => {
  const { user, session } = await createUser();
  const admin = await createUser({ role: "ADMIN" });
  const { team } = await generateTeam(user.id);

  const body = {
    createdAt: new Date(),
    description: "Initial commit",
    id: uuid.v4(),
    teamId: team.id,
    title: "Drop 001/The Early Years",
  };

  sandbox().stub(TeamsService, "checkCollectionsLimit").resolves({
    isReached: true,
    limit: 4,
  });

  const [postResponse, postBody] = await API.post("/collections", {
    headers: API.authHeader(session.id),
    body,
  });

  t.equal(
    postResponse.status,
    402,
    'POST with exceeded limit returns "402 Payment required" status'
  );
  t.deepEqual(postBody, {
    actionText: "Upgrade team",
    actionUrl: `/subscribe?upgradingTeamId=${team.id}`,
    message:
      "In order to create more than 4 collections, you must first upgrade your team.",
    title: "Upgrade team",
  });

  const [adminResponse] = await API.post("/collections", {
    headers: API.authHeader(admin.session.id),
    body,
  });
  t.equal(
    adminResponse.status,
    201,
    'Admin POST with exceeded limit returns "201 Created" status'
  );
});

test("PATCH /collections/:collectionId supports partial updates to a collection", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const { team } = await generateTeam(user.id);

  const body = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
    teamId: team.id,
  };

  const postResponse = await API.post("/collections", {
    headers: API.authHeader(session.id),
    body,
  });

  const updateBody = {
    description: "Updated Description",
    title: "Updated Title",
    id: body.id,
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

test("PATCH /collections/:collectionId request doesn not match type", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const { team } = await generateTeam(user.id);
  const body = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
    teamId: team.id,
  };

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
  t.equal(updateResponse[0].status, 400, "PATCH request does not match type");
});

test("PATCH /collections/:collectionId doesn't allow move collection to another team when the collection limit exceeded", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const { team } = await generateTeam(user.id);
  const { team: teamToMoveCollectionTo } = await generateTeam(user.id);
  const body = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
    teamId: team.id,
  };

  const postResponse = await API.post("/collections", {
    headers: API.authHeader(session.id),
    body,
  });

  const updateBody = {
    teamId: teamToMoveCollectionTo.id,
  };

  sandbox()
    .stub(TeamUsersService, "canUserMoveCollectionBetweenTeams")
    .resolves(true);
  const checkCollectionLimitStub = sandbox()
    .stub(TeamsService, "checkCollectionsLimit")
    .resolves({
      isReached: true,
      limit: 4,
    });

  const updateResponse = await API.patch(`/collections/${postResponse[1].id}`, {
    body: updateBody,
    headers: API.authHeader(session.id),
  });
  t.deepEqual(
    updateResponse[0].status,
    402,
    'PATCH with teamId and exceeded limit returns "402 Payment required" status'
  );

  // allows to admin
  const admin = await createUser({ role: "ADMIN" });

  const adminUpdateResponse = await API.patch(
    `/collections/${postResponse[1].id}`,
    {
      body: updateBody,
      headers: API.authHeader(admin.session.id),
    }
  );

  t.equal(
    adminUpdateResponse[0].status,
    200,
    "admin can update the team id then limit is exceeded"
  );

  // no limit - update should be successful for regular user
  checkCollectionLimitStub.resolves({
    isReached: false,
  });

  const successfulUpdateResponse = await API.patch(
    `/collections/${postResponse[1].id}`,
    {
      body: updateBody,
      headers: API.authHeader(session.id),
    }
  );

  t.equal(successfulUpdateResponse[0].status, 200, "update is successful");
  t.deepEqual(
    successfulUpdateResponse[1],
    {
      ...postResponse[1],
      teamId: teamToMoveCollectionTo.id,
    },
    "PATCH updates the collection team"
  );
});

test("PATCH /collections/:collectionId doesn't allow move collection to another team when user doesn't have enough permissions in both teams", async (t: tape.Test) => {
  const teamOwnerUser = await createUser();
  const { team } = await generateTeam(teamOwnerUser.user.id);
  const { team: teamToMoveCollectionTo } = await generateTeam(
    teamOwnerUser.user.id
  );
  const body = {
    createdAt: new Date(),
    createdBy: teamOwnerUser.user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
    teamId: team.id,
  };

  const postResponse = await API.post("/collections", {
    headers: API.authHeader(teamOwnerUser.session.id),
    body,
  });

  sandbox().stub(TeamsService, "checkCollectionsLimit").resolves({
    isReached: false,
  });

  const canUserMoveCollectionStub = sandbox()
    .stub(TeamUsersService, "canUserMoveCollectionBetweenTeams")
    .resolves(true);

  const successfulTeamOwnerUpdateResponse = await API.patch(
    `/collections/${postResponse[1].id}`,
    {
      body: {
        teamId: teamToMoveCollectionTo.id,
      },
      headers: API.authHeader(teamOwnerUser.session.id),
    }
  );

  t.equal(
    successfulTeamOwnerUpdateResponse[0].status,
    200,
    "update is successful"
  );
  t.deepEqual(
    successfulTeamOwnerUpdateResponse[1],
    {
      ...postResponse[1],
      teamId: teamToMoveCollectionTo.id,
    },
    "PATCH updates the collection team"
  );

  canUserMoveCollectionStub.resolves(false);

  const failedUpdateResponse = await API.patch(
    `/collections/${postResponse[1].id}`,
    {
      body: {
        teamId: teamToMoveCollectionTo.id,
      },
      headers: API.authHeader(teamOwnerUser.session.id),
    }
  );

  t.equal(
    failedUpdateResponse[0].status,
    403,
    "update is failed because of user restrictions"
  );
});

test("GET /collections", async (t: tape.Test) => {
  const { user, session } = await createUser();
  const another = await createUser();
  const admin = await createUser({ role: "ADMIN" });
  const { team } = await generateTeam(user.id);

  const collection1 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 001/The Early Years",
  });
  const collection2 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: another.user.id,
    deletedAt: null,
    description: "Another collection",
    id: uuid.v4(),
    teamId: null,
    title: "Drop 002",
  });
  const collection3 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: another.user.id,
    deletedAt: null,
    description: "Another collection",
    id: uuid.v4(),
    teamId: team.id,
    title: "Team Drop",
  });
  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });
  await generateCollaborator({
    collectionId: collection2.id,
    designId: null,
    invitationMessage: null,
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
  t.equal(getResponse.status, 200, 'GET returns "200 OK" status');
  t.deepEqual(
    collections,
    [
      {
        ...collection3,
        createdAt: collection3.createdAt.toISOString(),
        permissions: {
          canComment: true,
          canDelete: true,
          canEdit: true,
          canEditTitle: true,
          canEditVariants: true,
          canSubmit: true,
          canView: true,
        },
      },
      {
        ...collection2,
        createdAt: collection2.createdAt.toISOString(),
        permissions: {
          canComment: true,
          canDelete: false,
          canEdit: false,
          canEditTitle: false,
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
          canDelete: false,
          canEdit: true,
          canEditTitle: true,
          canEditVariants: true,
          canSubmit: true,
          canView: true,
        },
      },
    ],
    "Returns all collections I have access to."
  );

  const [, teamCollections] = await API.get(`/collections?teamId=${team.id}`, {
    headers: API.authHeader(session.id),
  });

  t.deepEqual(
    teamCollections,
    [
      {
        ...collection3,
        createdAt: collection3.createdAt.toISOString(),
        permissions: {
          canComment: true,
          canDelete: true,
          canEdit: true,
          canEditTitle: true,
          canEditVariants: true,
          canSubmit: true,
          canView: true,
        },
      },
    ],
    "Returns all team collections"
  );

  const [, adminTeamCollections] = await API.get(
    `/collections?teamId=${team.id}`,
    {
      headers: API.authHeader(admin.session.id),
    }
  );

  t.deepEqual(
    adminTeamCollections,
    [
      {
        ...collection3,
        createdAt: collection3.createdAt.toISOString(),
        permissions: {
          canComment: true,
          canDelete: true,
          canEdit: true,
          canEditTitle: true,
          canEditVariants: true,
          canSubmit: true,
          canView: true,
        },
      },
    ],
    "Returns all team collections with all permissions"
  );

  const [forbiddenResponse] = await API.get("/collections", {
    headers: API.authHeader(session.id),
  });

  t.equal(
    forbiddenResponse.status,
    403,
    'GET without user ID returns "403 Forbidden" status'
  );

  const [forbiddenTeam] = await API.get(`/collections?teamId=${team.id}`, {
    headers: API.authHeader(another.session.id),
  });
  t.equal(forbiddenTeam.status, 403, "Cannot get another team's collection");
});

test("GET /collections returns directly shared collections when called", async (t: tape.Test) => {
  const { user, session } = await createUser();

  const directStub = sandbox()
    .stub(CollectionsDAO, "findDirectlySharedWithUser")
    .resolves([
      {
        id: uuid.v4(),
        title: "Stub collection",
        teamId: null,
      },
    ]);

  sandbox().stub(CollaboratorsDAO, "findByCollectionAndUser").resolves([]);

  const [getResponse, collections] = await API.get(
    `/collections?userId=${user.id}&isDirectlyShared=true`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(getResponse.status, 200);
  t.equal(directStub.callCount, 1);
  t.equal(collections[0].title, "Stub collection");
});

test("DELETE /collections/:id", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const { team } = await generateTeam(user.id);
  const { session: session2, user: user2 } = await createUser();
  const { team: team2 } = await generateTeam(user2.id);
  const mine = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
    teamId: team.id,
  };
  const theirs = {
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: "Cheesy",
    id: uuid.v4(),
    title: "Nacho collection",
    teamId: team2.id,
  };
  sandbox().stub(TeamsService, "checkCollectionsLimit").resolves({
    isReached: false,
  });

  await API.post("/collections", {
    headers: API.authHeader(session.id),
    body: mine,
  });
  await API.post("/collections", {
    headers: API.authHeader(session2.id),
    body: theirs,
  });

  const designOne = await createDesign({
    description: "Generic Shirt",
    productType: "TEESHIRT",
    title: "T-Shirt One",
    userId: user.id,
  });
  const designTwo = await createDesign({
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

  const plan = await db.transaction(
    async (trx: Knex.Transaction) =>
      await generatePlan(trx, {
        id: uuid.v4(),
        billingInterval: BillingInterval.MONTHLY,
        monthlyCostCents: 4567,
        costOfGoodsShareBasisPoints: 0,
        revenueShareBasisPoints: 5000,
        stripePlanId: "plan_456",
        title: "Some More",
        isDefault: true,
        isPublic: false,
        ordering: null,
        description: null,
        baseCostPerBillingIntervalCents: 4567,
        perSeatCostPerBillingIntervalCents: 0,
        canSubmit: true,
        canCheckOut: true,
        maximumSeatsPerTeam: null,
        maximumCollections: null,
        includesFulfillment: true,
        upgradeToPlanId: null,
      })
  );

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
        teamId: null,
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
        teamId: null,
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
    teamId: null,
    title: "Drop 001/The Early Years",
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: collaborator.user.id,
  });
  const designOne = await createDesign({
    description: "Generic Shirt",
    productType: "TEESHIRT",
    title: "T-Shirt One",
    userId: owner.user.id,
    collectionIds: [collection.id],
  });
  const designTwo = await createDesign({
    description: "Generic Shirt",
    productType: "TEESHIRT",
    title: "T-Shirt Two",
    userId: owner.user.id,
    collectionIds: [collection.id],
  });

  const notificationStub = sandbox()
    .stub(CreateNotifications, "sendDesignerSubmitCollection")
    .resolves();
  const irisStub = sandbox().stub(IrisService, "sendMessage").resolves();

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

  t.equals(notificationStub.callCount, 1, "Calls notification stub once");
  t.equals(irisStub.args[0][0].resource.type, "SUBMIT_DESIGN");
  t.equals(irisStub.args[1][0].resource.type, "SUBMIT_DESIGN");
  t.equals(irisStub.args[2][0].type, "collection/status-updated");

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
  await db.transaction(async (trx: Knex.Transaction) => {
    t.deepEqual(
      (await ApprovalStepsDAO.findById(
        trx,
        designOneEvents[0].approvalStepId!
      ))!.type,
      ApprovalStepType.CHECKOUT,
      "Submission is associated with the checkout step"
    );
    t.deepEqual(
      (await ApprovalStepsDAO.findById(
        trx,
        designTwoEvents[0].approvalStepId!
      ))!.type,
      ApprovalStepType.CHECKOUT,
      "Submission is associated with the checkout step"
    );
  });

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
    teamId: null,
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
    teamId: null,
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
  const newTimeBody = bodyOk.map((el: CollectionDb) => ({
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
