'use strict';

const uuid = require('node-uuid');
const sinon = require('sinon');
const CollectionsDAO = require('../../dao/collections');
const CollaboratorsDAO = require('../../dao/collaborators');
const createUser = require('../../test-helpers/create-user');
const ProductDesignsDAO = require('../../dao/product-designs');
const DesignEventsDAO = require('../../dao/design-events');
const {
  authHeader, del, post, get, patch, put
} = require('../../test-helpers/http');
const { sandbox, test } = require('../../test-helpers/fresh');
const CreateNotifications = require('../../services/create-notifications');

function simulateAPISerialization(object) {
  return JSON.parse(JSON.stringify(object));
}

test('GET /collections/:id returns a created collection', async (t) => {
  const { session } = await createUser();
  const body = {
    title: 'Drop 001/The Early Years',
    description: 'Initial commit'
  };
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      id: uuid.v4(),
      userId: uuid.v4(),
      collectionId: uuid.v4(),
      role: 'EDIT'
    });

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

test('PATCH /collections/:collectionId allows updates to a collection', async (t) => {
  const { session } = await createUser();
  const body = {
    title: 'Drop 001/The Early Years',
    description: 'Initial commit'
  };
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      id: uuid.v4(),
      userId: uuid.v4(),
      collectionId: uuid.v4(),
      role: 'EDIT'
    });

  const postResponse = await post(
    '/collections',
    { headers: authHeader(session.id), body }
  );

  const updateBody = { title: 'Droppin bombs' };
  const updateResponse = await patch(
    `/collections/${postResponse[1].id}`,
    { body: updateBody, headers: authHeader(session.id) }
  );
  t.deepEqual(
    updateResponse[1],
    { ...postResponse[1], title: updateBody.title },
    'PATCH updates the record'
  );
});

test('GET /collections', async (t) => {
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
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      id: uuid.v4(),
      userId: uuid.v4(),
      collectionId: uuid.v4(),
      role: 'EDIT'
    });

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
  const [forbiddenResponse] = await get(
    '/collections',
    { headers: authHeader(session.id) }
  );

  t.equal(postResponse.status, 201, 'POST returns "201 Created" status');
  t.equal(getResponse.status, 200, 'GET returns "200 OK" status');
  t.equal(
    forbiddenResponse.status,
    403,
    'GET without user ID returns "403 Forbidden" status'
  );
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
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      id: uuid.v4(),
      userId: uuid.v4(),
      collectionId: uuid.v4(),
      role: 'EDIT'
    });

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

test('PUT /collections/:id/designs/:id', async (t) => {
  const { user, session } = await createUser();
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      id: uuid.v4(),
      userId: uuid.v4(),
      collectionId: uuid.v4(),
      role: 'EDIT'
    });

  const collection = await post(
    '/collections',
    {
      headers: authHeader(session.id),
      body: {
        title: 'Drop 001/The Early Years',
        description: 'Initial commit'
      }
    }
  );
  const otherCollection = await post(
    '/collections',
    {
      headers: authHeader(session.id),
      body: {
        title: 'Drop 002/Empire Strikes Back',
        description: 'Ewoks'
      }
    }
  );
  const design = await post(
    '/product-designs',
    {
      headers: authHeader(session.id),
      body: {
        title: 'Vader Mask',
        description: 'Black, bold, beautiful',
        userId: user.id
      }
    }
  );
  const collectionDesigns = await put(
    `/collections/${collection[1].id}/designs/${design[1].id}`,
    { headers: authHeader(session.id) }
  );

  t.equal(
    collectionDesigns[1][0].id,
    design[1].id,
    'adds design to collection and returns all designs for collection'
  );

  const designInOtherCollection = await put(
    `/collections/${otherCollection[1].id}/designs/${design[1].id}`,
    { headers: authHeader(session.id) }
  );
  t.equal(
    designInOtherCollection[1][0].id,
    design[1].id,
    'adding a design to a second collection moves it there'
  );
});

test('DELETE /collections/:id/designs/:id', async (t) => {
  const { user, session } = await createUser();
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      id: uuid.v4(),
      userId: uuid.v4(),
      collectionId: uuid.v4(),
      role: 'EDIT'
    });

  const collection = await post(
    '/collections',
    {
      headers: authHeader(session.id),
      body: {
        title: 'Drop 001/The Early Years',
        description: 'Initial commit'
      }
    }
  );
  const design = await post(
    '/product-designs',
    {
      headers: authHeader(session.id),
      body: {
        title: 'Vader Mask',
        description: 'Black, bold, beautiful',
        userId: user.id
      }
    }
  );
  await put(
    `/collections/${collection[1].id}/designs/${design[1].id}`,
    { headers: authHeader(session.id) }
  );
  const collectionDesigns = await del(
    `/collections/${collection[1].id}/designs/${design[1].id}`,
    { headers: authHeader(session.id) }
  );

  t.deepEqual(
    collectionDesigns[1],
    [],
    'removes design from collection'
  );
});

test('GET /collections/:id/designs', async (t) => {
  const { user, session } = await createUser();
  sandbox()
    .stub(CollaboratorsDAO, 'create')
    .resolves({
      id: uuid.v4(),
      userId: uuid.v4(),
      collectionId: uuid.v4(),
      role: 'EDIT'
    });


  const collection = await CollectionsDAO.create({
    createdBy: user.id,
    title: 'Drop 001/The Early Years',
    description: 'Initial commit'
  });

  const design = await ProductDesignsDAO.create({
    title: 'Vader Mask',
    description: 'Black, bold, beautiful',
    userId: user.id
  });

  await put(
    `/collections/${collection.id}/designs/${design.id}`,
    { headers: authHeader(session.id) }
  );

  const [_res, designs] = await get(
    `/collections/${collection.id}/designs`,
    { headers: authHeader(session.id) }
  );

  t.equal(designs.length, 1);

  t.deepEqual(
    designs[0],
    Object.assign(
      {},
      simulateAPISerialization(design),
      { collectionIds: [collection.id] }
    ),
    'returns a list of contained designs'
  );
});

test('POST /collections/:id/submissions', async (t) => {
  const { user, session } = await createUser();

  const collection = await CollectionsDAO.create({
    createdBy: user.id,
    description: 'Initial commit',
    title: 'Drop 001/The Early Years'
  });
  const designOne = await ProductDesignsDAO.create({
    title: 'T-Shirt One',
    description: 'Generic Shirt',
    userId: user.id
  });
  const designTwo = await ProductDesignsDAO.create({
    title: 'T-Shirt Two',
    description: 'Generic Shirt',
    userId: user.id
  });
  await CollectionsDAO.moveDesign(collection.id, designOne.id);
  await CollectionsDAO.moveDesign(collection.id, designTwo.id);

  const notificationStub = sandbox()
    .stub(CreateNotifications, 'sendDesignerSubmitCollection')
    .resolves();

  const serviceId = uuid.v4();
  const [response, body] = await post(
    `/collections/${collection.id}/submissions`,
    {
      headers: authHeader(session.id),
      body: {
        collectionId: collection.id,
        createdAt: new Date(),
        createdBy: user.id,
        deletedAt: null,
        id: serviceId,
        needsDesignConsulting: true,
        needsFulfillment: true,
        needsPackaging: true
      }
    }
  );

  const designEventOne = await DesignEventsDAO.findByDesignId(designOne.id);
  const designEventTwo = await DesignEventsDAO.findByDesignId(designTwo.id);

  sinon.assert.callCount(notificationStub, 1);

  t.deepEqual(response.status, 201, 'Successfully posts');
  t.deepEqual(body, {
    collectionId: collection.id,
    isSubmitted: true,
    isCosted: false,
    isPaired: false
  }, 'Returns current submission status');
  t.deepEqual(designEventOne[0].type, 'SUBMIT_DESIGN', 'Submitted the design to CALA');
  t.deepEqual(designEventTwo[0].type, 'SUBMIT_DESIGN', 'Submitted the design to CALA');
});

test('GET /collections/:collectionId/submissions', async (t) => {
  sandbox()
    .stub(CreateNotifications, 'sendDesignerSubmitCollection')
    .resolves();

  const designer = await createUser();
  const admin = await createUser({ role: 'ADMIN' });
  const collection = await CollectionsDAO.create({
    createdBy: designer.user.id,
    description: 'Initial commit',
    title: 'Drop 001/The Early Years'
  });
  const designOne = await ProductDesignsDAO.create({
    title: 'T-Shirt One',
    description: 'Generic Shirt',
    userId: designer.user.id
  });
  const designTwo = await ProductDesignsDAO.create({
    title: 'T-Shirt Two',
    description: 'Generic Shirt',
    userId: designer.user.id
  });
  await CollectionsDAO.moveDesign(collection.id, designOne.id);
  await CollectionsDAO.moveDesign(collection.id, designTwo.id);

  const statusOne = await get(
    `/collections/${collection.id}/submissions`,
    { headers: authHeader(designer.session.id) }
  );

  t.equal(statusOne[0].status, 200);
  t.deepEqual(statusOne[1], {
    collectionId: collection.id,
    isSubmitted: false,
    isCosted: false,
    isPaired: false
  });

  await post(
    `/collections/${collection.id}/submissions`,
    {
      headers: authHeader(designer.session.id),
      body: {
        collectionId: collection.id,
        createdAt: new Date(),
        createdBy: designer.user.id,
        deletedAt: null,
        id: uuid.v4(),
        needsDesignConsulting: true,
        needsFulfillment: true,
        needsPackaging: true
      }
    }
  );

  const statusTwo = await get(
    `/collections/${collection.id}/submissions`,
    { headers: authHeader(designer.session.id) }
  );

  t.equal(statusTwo[0].status, 200);
  t.deepEqual(statusTwo[1], {
    collectionId: collection.id,
    isSubmitted: true,
    isCosted: false,
    isPaired: false
  });

  const commitEvent = {
    actorId: admin.user.id,
    targetId: designer.user.id,
    type: 'COMMIT_COST_INPUTS'
  };

  await post(
    `/product-designs/${designOne.id}/events`,
    {
      headers: authHeader(admin.session.id),
      body: [commitEvent]
    }
  );
  await post(
    `/product-designs/${designTwo.id}/events`,
    {
      headers: authHeader(admin.session.id),
      body: [commitEvent]
    }
  );

  const statusThree = await get(
    `/collections/${collection.id}/submissions`,
    { headers: authHeader(designer.session.id) }
  );

  t.equal(statusThree[0].status, 200);
  t.deepEqual(statusThree[1], {
    collectionId: collection.id,
    isSubmitted: true,
    isCosted: true,
    isPaired: false
  });
});
