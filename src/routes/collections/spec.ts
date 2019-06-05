import * as uuid from 'node-uuid';
import * as sinon from 'sinon';
import * as tape from 'tape';

import * as CollectionsDAO from '../../dao/collections';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import createUser = require('../../test-helpers/create-user');
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as DesignEventsDAO from '../../dao/design-events';
import * as API from '../../test-helpers/http';
import { sandbox, test } from '../../test-helpers/fresh';
import * as CreateNotifications from '../../services/create-notifications';
import * as DesignTasksService from '../../services/create-design-tasks';
import { stubFindWithUncostedDesigns } from '../../test-helpers/stubs/collections-dao';
import Collection from '../../domain-objects/collection';
import generateCollaborator from '../../test-helpers/factories/collaborator';

test('GET /collections/:id returns a created collection', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const body = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  };
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      collectionId: uuid.v4(),
      id: uuid.v4(),
      role: 'EDIT',
      userId: uuid.v4()
    });

  const [postResponse, postCollection] = await API.post('/collections', {
    headers: API.authHeader(session.id),
    body
  });
  const [getResponse, getCollection] = await API.get(
    `/collections/${postCollection.id}`,
    { headers: API.authHeader(session.id) }
  );

  t.equal(postResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(getResponse.status, 200, 'GET returns "200 OK" status');
  t.deepEqual(
    postCollection,
    getCollection,
    'return from POST is identical to GET'
  );
});

test('POST /collections/ without a full object can create a collection', async (t: tape.Test) => {
  const { session } = await createUser();
  const body = {
    createdAt: new Date(),
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  };
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      collectionId: uuid.v4(),
      id: uuid.v4(),
      role: 'EDIT',
      userId: uuid.v4()
    });

  const [postResponse, postCollection] = await API.post('/collections', {
    headers: API.authHeader(session.id),
    body
  });
  const [getResponse, getCollection] = await API.get(
    `/collections/${postCollection.id}`,
    { headers: API.authHeader(session.id) }
  );

  t.equal(postResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(getResponse.status, 200, 'GET returns "200 OK" status');
  t.deepEqual(
    postCollection,
    getCollection,
    'return from POST is identical to GET'
  );
});

test('PATCH /collections/:collectionId allows updates to a collection', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const body = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  };
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      collectionId: uuid.v4(),
      id: uuid.v4(),
      role: 'EDIT',
      userId: uuid.v4()
    });

  const postResponse = await API.post('/collections', {
    headers: API.authHeader(session.id),
    body
  });

  const updateBody = {
    createdAt: postResponse[1].createdAt,
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: postResponse[1].id,
    title: 'Droppin bombs'
  };
  const updateResponse = await API.patch(`/collections/${postResponse[1].id}`, {
    body: updateBody,
    headers: API.authHeader(session.id)
  });
  t.deepEqual(
    updateResponse[1],
    { ...postResponse[1], title: updateBody.title },
    'PATCH updates the record'
  );
});

test('PATCH /collections/:collectionId supports partial updates to a collection', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const body = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  };
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      collectionId: uuid.v4(),
      id: uuid.v4(),
      role: 'EDIT',
      userId: uuid.v4()
    });

  const postResponse = await API.post('/collections', {
    headers: API.authHeader(session.id),
    body
  });

  const updateBody = {
    description: 'Updated Description',
    title: 'Updated Title'
  };
  const updateResponse = await API.patch(`/collections/${postResponse[1].id}`, {
    body: updateBody,
    headers: API.authHeader(session.id)
  });
  t.deepEqual(
    updateResponse[1],
    {
      ...postResponse[1],
      description: updateBody.description,
      title: updateBody.title
    },
    'PATCH updates the record'
  );
});

test('GET /collections', async (t: tape.Test) => {
  const { user, session } = await createUser();
  const { user: user2 } = await createUser();

  const collection1 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  const collection2 = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: 'Another collection',
    id: uuid.v4(),
    title: 'Drop 002'
  });
  await generateCollaborator({
    collectionId: collection1.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });
  await generateCollaborator({
    collectionId: collection2.id,
    designId: null,
    invitationMessage: '',
    role: 'VIEW',
    userEmail: null,
    userId: user.id
  });

  const [getResponse, collections] = await API.get(
    `/collections?userId=${user.id}`,
    { headers: API.authHeader(session.id) }
  );
  const [forbiddenResponse] = await API.get('/collections', {
    headers: API.authHeader(session.id)
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
          canView: true
        }
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
          canView: true
        }
      }
    ],
    'Returns all collections I have access to.'
  );
});

test('DELETE /collections/:id', async (t: tape.Test) => {
  const { session, user } = await createUser();
  const { session: session2, user: user2 } = await createUser();
  const mine = {
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  };
  const theirs = {
    createdAt: new Date(),
    createdBy: user2.id,
    deletedAt: null,
    description: 'Cheesy',
    id: uuid.v4(),
    title: 'Nacho collection'
  };
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      collectionId: uuid.v4(),
      id: uuid.v4(),
      role: 'EDIT',
      userId: uuid.v4()
    });

  const [postResponse, postCollection] = await API.post('/collections', {
    headers: API.authHeader(session.id),
    body: mine
  });
  const [otherResponse, otherCollection] = await API.post('/collections', {
    headers: API.authHeader(session2.id),
    body: theirs
  });
  const [deleteResponse] = await API.del(`/collections/${postCollection.id}`, {
    headers: API.authHeader(session.id)
  });
  const [failureResponse] = await API.del(
    `/collections/${otherCollection.id}`,
    { headers: API.authHeader(session.id) }
  );

  t.equal(postResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(deleteResponse.status, 204, 'DELETE returns "204 No Content" status');

  t.equal(otherResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(
    failureResponse.status,
    403,
    'DELETE on unowned collection returns "403 Forbidden" status'
  );
});

test('PUT /collections/:id/designs/:id', async (t: tape.Test) => {
  const { user, session } = await createUser();
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      collectionId: uuid.v4(),
      id: uuid.v4(),
      role: 'EDIT',
      userId: uuid.v4()
    });

  const collection = await API.post('/collections', {
    body: {
      createdAt: new Date(),
      createdBy: user.id,
      deletedAt: null,
      description: 'Initial commit',
      id: uuid.v4(),
      title: 'Drop 001/The Early Years'
    },
    headers: API.authHeader(session.id)
  });
  const otherCollection = await API.post('/collections', {
    body: {
      createdAt: new Date(),
      createdBy: user.id,
      deletedAt: null,
      description: 'Ewoks',
      id: uuid.v4(),
      title: 'Drop 002/Empire Strikes Back'
    },
    headers: API.authHeader(session.id)
  });
  const design = await API.post('/product-designs', {
    body: {
      description: 'Black, bold, beautiful',
      title: 'Vader Mask',
      userId: user.id
    },
    headers: API.authHeader(session.id)
  });
  const collectionDesigns = await API.put(
    `/collections/${collection[1].id}/designs/${design[1].id}`,
    { headers: API.authHeader(session.id) }
  );

  t.equal(
    collectionDesigns[1][0].id,
    design[1].id,
    'adds design to collection and returns all designs for collection'
  );

  const designInOtherCollection = await API.put(
    `/collections/${otherCollection[1].id}/designs/${design[1].id}`,
    { headers: API.authHeader(session.id) }
  );
  t.equal(
    designInOtherCollection[1][0].id,
    design[1].id,
    'adding a design to a second collection moves it there'
  );
});

test('DELETE /collections/:id/designs/:id', async (t: tape.Test) => {
  const { user, session } = await createUser();
  const { session: session2 } = await createUser();

  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      collectionId: uuid.v4(),
      id: uuid.v4(),
      role: 'EDIT',
      userId: uuid.v4()
    });

  const collection = await API.post('/collections', {
    body: {
      createdAt: new Date(),
      createdBy: user.id,
      deletedAt: null,
      description: 'Initial commit',
      id: uuid.v4(),
      title: 'Drop 001/The Early Years'
    },
    headers: API.authHeader(session.id)
  });
  const design = await API.post('/product-designs', {
    body: {
      description: 'Black, bold, beautiful',
      title: 'Vader Mask',
      userId: user.id
    },
    headers: API.authHeader(session.id)
  });
  await API.put(`/collections/${collection[1].id}/designs/${design[1].id}`, {
    headers: API.authHeader(session.id)
  });

  const failedResponse = await API.del(
    `/collections/${collection[1].id}/designs/${design[1].id}`,
    { headers: API.authHeader(session2.id) }
  );
  t.equal(failedResponse[0].status, 403, 'Only the owner can delete a design');

  const collectionDesigns = await API.del(
    `/collections/${collection[1].id}/designs/${design[1].id}`,
    { headers: API.authHeader(session.id) }
  );

  t.deepEqual(collectionDesigns[1], [], 'removes design from collection');
});

test('GET /collections/:id/designs', async (t: tape.Test) => {
  const { user, session } = await createUser();

  const createdAt = new Date();
  const collection = await CollectionsDAO.create({
    createdAt,
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  const design = await ProductDesignsDAO.create({
    description: 'Black, bold, beautiful',
    productType: 'HELMET',
    title: 'Vader Mask',
    userId: user.id
  });
  await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  await API.put(`/collections/${collection.id}/designs/${design.id}`, {
    headers: API.authHeader(session.id)
  });

  const [, designs] = await API.get(`/collections/${collection.id}/designs`, {
    headers: API.authHeader(session.id)
  });

  t.equal(designs.length, 1);
  t.deepEqual(
    designs[0],
    {
      ...design,
      collectionIds: [collection.id],
      collections: [{ id: collection.id, title: collection.title }],
      createdAt: design.createdAt.toISOString(),
      permissions: {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true
      },
      role: 'EDIT'
    },
    'returns a list of contained designs'
  );
});

test('POST /collections/:id/submissions', async (t: tape.Test) => {
  const owner = await createUser();
  const collaborator = await createUser();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: owner.user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: collaborator.user.id
  });
  const designOne = await ProductDesignsDAO.create({
    description: 'Generic Shirt',
    productType: 'TEESHIRT',
    title: 'T-Shirt One',
    userId: owner.user.id
  });
  const designTwo = await ProductDesignsDAO.create({
    description: 'Generic Shirt',
    productType: 'TEESHIRT',
    title: 'T-Shirt Two',
    userId: owner.user.id
  });
  await CollectionsDAO.moveDesign(collection.id, designOne.id);
  await CollectionsDAO.moveDesign(collection.id, designTwo.id);

  const notificationStub = sandbox()
    .stub(CreateNotifications, 'sendDesignerSubmitCollection')
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
        needsPackaging: true
      },
      headers: API.authHeader(owner.session.id)
    }
  );

  const designEventOne = await DesignEventsDAO.findByDesignId(designOne.id);
  const designEventTwo = await DesignEventsDAO.findByDesignId(designTwo.id);

  sinon.assert.callCount(notificationStub, 1);

  t.deepEqual(response.status, 201, 'Successfully posts');
  t.deepEqual(
    body,
    {
      collectionId: collection.id,
      isCosted: false,
      isPaired: false,
      isQuoted: false,
      isSubmitted: true
    },
    'Returns current submission status'
  );
  t.deepEqual(
    designEventOne[0].type,
    'SUBMIT_DESIGN',
    'Submitted the design to CALA'
  );
  t.deepEqual(
    designEventTwo[0].type,
    'SUBMIT_DESIGN',
    'Submitted the design to CALA'
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
        needsPackaging: true
      },
      headers: API.authHeader(collaborator.session.id)
    }
  );

  t.equal(
    collaboratorPost[0].status,
    201,
    'Collaborators can submit collections'
  );

  const designThree = await ProductDesignsDAO.create({
    description: 'Generic Shirt',
    productType: 'TEESHIRT',
    title: 'T-Shirt Two',
    userId: owner.user.id
  });
  await CollectionsDAO.moveDesign(collection.id, designThree.id);

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
        needsPackaging: true
      },
      headers: API.authHeader(owner.session.id)
    }
  );
  t.deepEqual(secondSubmission[0].status, 201, 'Successfully posts');
  t.deepEqual(
    secondSubmission[1],
    {
      collectionId: collection.id,
      isCosted: false,
      isPaired: false,
      isQuoted: false,
      isSubmitted: true
    },
    'Returns current submission status'
  );
});

test('GET /collections/:collectionId/submissions', async (t: tape.Test) => {
  sandbox()
    .stub(CreateNotifications, 'sendDesignerSubmitCollection')
    .resolves();

  const designer = await createUser();
  const admin = await createUser({ role: 'ADMIN' });
  const collaborator = await createUser();
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: designer.user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });
  await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: collaborator.user.id
  });
  const designOne = await ProductDesignsDAO.create({
    description: 'Generic Shirt',
    productType: 'TEESHIRT',
    title: 'T-Shirt One',
    userId: designer.user.id
  });
  const designTwo = await ProductDesignsDAO.create({
    description: 'Generic Shirt',
    productType: 'TEESHIRT',
    title: 'T-Shirt Two',
    userId: designer.user.id
  });
  await CollectionsDAO.moveDesign(collection.id, designOne.id);
  await CollectionsDAO.moveDesign(collection.id, designTwo.id);

  const statusOne = await API.get(`/collections/${collection.id}/submissions`, {
    headers: API.authHeader(designer.session.id)
  });

  t.equal(statusOne[0].status, 200);
  t.deepEqual(statusOne[1], {
    collectionId: collection.id,
    isCosted: false,
    isPaired: false,
    isQuoted: false,
    isSubmitted: false
  });

  await API.post(`/collections/${collection.id}/submissions`, {
    body: {
      collectionId: collection.id,
      createdAt: new Date(),
      createdBy: designer.user.id,
      deletedAt: null,
      id: uuid.v4(),
      needsDesignConsulting: true,
      needsFulfillment: true,
      needsPackaging: true
    },
    headers: API.authHeader(designer.session.id)
  });

  const statusTwo = await API.get(`/collections/${collection.id}/submissions`, {
    headers: API.authHeader(designer.session.id)
  });

  t.equal(statusTwo[0].status, 200);
  t.deepEqual(statusTwo[1], {
    collectionId: collection.id,
    isCosted: false,
    isPaired: false,
    isQuoted: false,
    isSubmitted: true
  });

  const commitEvent = {
    actorId: admin.user.id,
    targetId: designer.user.id,
    type: 'COMMIT_COST_INPUTS'
  };

  await API.post(`/product-designs/${designOne.id}/events`, {
    body: [commitEvent],
    headers: API.authHeader(admin.session.id)
  });
  await API.post(`/product-designs/${designTwo.id}/events`, {
    body: [commitEvent],
    headers: API.authHeader(admin.session.id)
  });

  const statusThree = await API.get(
    `/collections/${collection.id}/submissions`,
    { headers: API.authHeader(designer.session.id) }
  );

  t.equal(statusThree[0].status, 200);
  t.deepEqual(statusThree[1], {
    collectionId: collection.id,
    isCosted: true,
    isPaired: false,
    isQuoted: false,
    isSubmitted: true
  });

  const commitQuoteEvent = {
    actorId: designer.user.id,
    targetId: null,
    type: 'COMMIT_QUOTE'
  };

  await API.post(`/product-designs/${designOne.id}/events`, {
    body: [commitQuoteEvent],
    headers: API.authHeader(designer.session.id)
  });
  await API.post(`/product-designs/${designTwo.id}/events`, {
    body: [commitQuoteEvent],
    headers: API.authHeader(designer.session.id)
  });

  const statusFour = await API.get(
    `/collections/${collection.id}/submissions`,
    { headers: API.authHeader(designer.session.id) }
  );

  t.equal(statusFour[0].status, 200);
  t.deepEqual(statusFour[1], {
    collectionId: collection.id,
    isCosted: true,
    isPaired: false,
    isQuoted: true,
    isSubmitted: true
  });

  const collaboratorGet = await API.get(
    `/collections/${collection.id}/submissions`,
    { headers: API.authHeader(collaborator.session.id) }
  );

  t.equal(collaboratorGet[0].status, 200);
  t.deepEqual(collaboratorGet[1], {
    collectionId: collection.id,
    isCosted: true,
    isPaired: false,
    isQuoted: true,
    isSubmitted: true
  });
});

test('POST /collections/:collectionId/cost-inputs', async (t: tape.Test) => {
  const designer = await createUser();
  const admin = await createUser({ role: 'ADMIN' });

  const collectionOne = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: designer.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'Yohji Yamamoto SS19'
  });
  const designOne = await ProductDesignsDAO.create({
    description: 'Oversize Placket Shirt',
    productType: 'SHIRT',
    title: 'Cozy Shirt',
    userId: designer.user.id
  });
  const designTwo = await ProductDesignsDAO.create({
    description: 'Gabardine Wool Pant',
    productType: 'PANT',
    title: 'Balloon Pants',
    userId: designer.user.id
  });
  await CollectionsDAO.moveDesign(collectionOne.id, designOne.id);
  await CollectionsDAO.moveDesign(collectionOne.id, designTwo.id);

  const notificationStub = sandbox()
    .stub(CreateNotifications, 'immediatelySendFullyCostedCollection')
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

  const designOneEvents = await DesignEventsDAO.findByDesignId(designOne.id);
  t.equal(designOneEvents.length, 1, 'Creates one design event for the design');
  t.equal(
    designOneEvents[0].type,
    'COMMIT_COST_INPUTS',
    'Creates a cost input event'
  );
  const designTwoEvents = await DesignEventsDAO.findByDesignId(designTwo.id);
  t.equal(designTwoEvents.length, 1, 'Creates one design event for the design');
  t.equal(
    designTwoEvents[0].type,
    'COMMIT_COST_INPUTS',
    'Creates a second cost input event'
  );
});

test('POST /collections/:collectionId/partner-pairings', async (t: tape.Test) => {
  const designer = await createUser();
  const admin = await createUser({ role: 'ADMIN' });

  const createDesignTasksSpy = sandbox().spy(
    DesignTasksService,
    'createDesignTasks'
  );

  const collectionOne = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: designer.user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'Yohji Yamamoto SS19'
  });
  const designOne = await ProductDesignsDAO.create({
    description: 'Oversize Placket Shirt',
    productType: 'SHIRT',
    title: 'Cozy Shirt',
    userId: designer.user.id
  });
  const designTwo = await ProductDesignsDAO.create({
    description: 'Gabardine Wool Pant',
    productType: 'PANT',
    title: 'Balloon Pants',
    userId: designer.user.id
  });
  await CollectionsDAO.moveDesign(collectionOne.id, designOne.id);
  await CollectionsDAO.moveDesign(collectionOne.id, designTwo.id);

  const failedPartnerPairing = await API.post(
    `/collections/${collectionOne.id}/partner-pairings`,
    { headers: API.authHeader(designer.session.id) }
  );
  t.equal(failedPartnerPairing[0].status, 403);

  const partnerPairing = await API.post(
    `/collections/${collectionOne.id}/partner-pairings`,
    { headers: API.authHeader(admin.session.id) }
  );
  t.equal(partnerPairing[0].status, 204);

  const designOneEvents = await DesignEventsDAO.findByDesignId(designOne.id);
  t.equal(designOneEvents.length, 1, 'Creates one design event for the design');
  t.equal(
    designOneEvents[0].type,
    'COMMIT_PARTNER_PAIRING',
    'Creates a partner pairing event'
  );
  const designTwoEvents = await DesignEventsDAO.findByDesignId(designTwo.id);
  t.equal(designTwoEvents.length, 1, 'Creates one design event for the design');
  t.equal(
    designTwoEvents[0].type,
    'COMMIT_PARTNER_PAIRING',
    'Creates a partner pairing event'
  );

  t.assert(
    createDesignTasksSpy.calledTwice,
    'Design tasks are generated for each design'
  );
});

test('GET /collections?isSubmitted=true&isCosted=false returns collections with uncosted designs', async (t: tape.Test) => {
  const { session: sessionAdmin } = await createUser({ role: 'ADMIN' });
  const { session: sessionUser } = await createUser();

  const { collections } = stubFindWithUncostedDesigns();
  const [responseOk, bodyOk] = await API.get(
    '/collections?isSubmitted=true&isCosted=false',
    {
      headers: API.authHeader(sessionAdmin.id)
    }
  );

  t.equal(responseOk.status, 200, 'GET returns "200 OK" status');
  t.equal(bodyOk.length, 2, '2 collections are returned');
  const newTimeBody = bodyOk.map((el: Collection) => ({
    ...el,
    createdAt: new Date(el.createdAt)
  }));
  t.deepEqual(newTimeBody, collections, 'collections match stub');

  const [responseBad] = await API.get(
    '/collections?isSubmitted=false&isCosted=false',
    {
      headers: API.authHeader(sessionUser.id)
    }
  );

  t.equal(
    responseBad.status,
    403,
    'GET returns "403 Permission Denied" status'
  );
});
