import * as uuid from 'node-uuid';

import * as CollaboratorsDAO from './dao';
import CollectionsDAO = require('../../dao/collections');
import createUser = require('../../test-helpers/create-user');
import EmailService = require('../../services/email');
import ProductDesignsDAO = require('../../dao/product-designs');
import { authHeader, del, get, patch, post } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import { stubFindByDesigns } from '../../test-helpers/stubs/collaborators-dao';
import createDesign from '../../services/create-design';

test(
  'DELETE /collaborators/:id returns 404 if collaborator was already deleted',
  async (t: Test) => {
    const { session, user } = await createUser();
    const design = await ProductDesignsDAO.create({
      productType: 'TEESHIRT',
      title: 'Plain White Tee',
      userId: user.id
    });

    const collaborator = await CollaboratorsDAO.create({
      collectionId: null,
      designId: design.id,
      invitationMessage: '',
      role: 'EDIT',
      userEmail: 'person@example.com',
      userId: null
    });

    const [firstResponse] = await del(`/collaborators/${collaborator.id}`, {
      headers: authHeader(session.id)
    });
    t.equal(firstResponse.status, 204);

    const [secondResponse, body] = await del(`/collaborators/${collaborator.id}`, {
      headers: authHeader(session.id)
    });
    t.equal(secondResponse.status, 404);
    t.equal(body.message, 'Collaborator not found');
  }
);

test('GET /product-design-collaborators/:id is accessible at the old URL', async (t: Test) => {
  const { session, user } = await createUser();
  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });

  const [response, body] = await get(`/product-design-collaborators?designId=${design.id}`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.deepEqual(body, []);
});

test('POST /collaborators allows adding collaborators on a collection', async (t: Test) => {
  sandbox().stub(EmailService, 'enqueueSend').resolves();

  const { session, user } = await createUser();
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });

  const [response, body] = await post('/collaborators', {
    body: {
      collectionId: collection.id,
      invitationMessage: "TAke a look, y'all",
      role: 'EDIT',
      userEmail: 'you@example.com'
    },
    headers: authHeader(session.id)
  });

  t.equal(response.status, 201);
  t.equal(body.collectionId, collection.id);
  t.equal(body.designId, null);
});

test('PATCH /collaborators allows updating collaborators on a collection', async (t: Test) => {
  sandbox().stub(EmailService, 'enqueueSend').resolves();

  const { session, user } = await createUser();
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });

  const responseList = await post('/collaborators', {
    body: {
      collectionId: collection.id,
      invitationMessage: "TAke a look, y'all",
      role: 'EDIT',
      userEmail: 'you@example.com'
    },
    headers: authHeader(session.id)
  });

  const [response, body] = await patch(`/collaborators/${responseList[1].id}`, {
    body: {
      role: 'VIEW'
    },
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.equal(body.collectionId, collection.id);
  t.equal(body.role, 'VIEW');
  t.equal(body.designId, null);
});

test('PATCH /collaborators allows updating collaborators on a design', async (t: Test) => {
  sandbox().stub(EmailService, 'enqueueSend').resolves();

  const { session, user } = await createUser();
  const design = await ProductDesignsDAO.create({
    productType: 'fdafd',
    title: 'AW19',
    userId: user.id
  });

  const responseList = await post('/collaborators', {
    body: {
      designId: design.id,
      invitationMessage: "TAke a look, y'all",
      role: 'EDIT',
      userEmail: 'you@example.com'
    },
    headers: authHeader(session.id)
  });

  const [response, body] = await patch(`/collaborators/${responseList[1].id}`, {
    body: {
      role: 'VIEW'
    },
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.equal(body.designId, design.id);
  t.equal(body.role, 'VIEW');
  t.equal(body.collectionId, null);
});

test('POST /collaborators throws 400 with unknown role', async (t: Test) => {
  sandbox().stub(EmailService, 'enqueueSend').resolves();

  const { session, user } = await createUser();
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });

  const [response, body] = await post('/collaborators', {
    body: {
      collectionId: collection.id,
      invitationMessage: "TAke a look, y'all",
      role: 'FRIEND',
      userEmail: 'you@example.com'
    },
    headers: authHeader(session.id)
  });

  t.equal(response.status, 400);
  t.equal(body.message, 'Unknown role: FRIEND');
});

test('GET /collaborators allows querying by collection ID', async (t: Test) => {
  sandbox().stub(EmailService, 'enqueueSend').resolves();
  const { session, user } = await createUser();

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });

  await post('/collaborators', {
    body: {
      collectionId: collection.id,
      invitationMessage: "TAke a look, y'all",
      role: 'EDIT',
      userEmail: 'you@example.com'
    },
    headers: authHeader(session.id)
  });

  const [response, body] = await get(`/collaborators?collectionId=${collection.id}`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].collectionId, collection.id);
  t.equal(body[0].designId, null);
});

test('GET /collaborators?designIds= allows querying by design ids', async (t: Test) => {
  const { session, user } = await createUser();
  const { session: randomSession } = await createUser();
  stubFindByDesigns(user.id);

  const design = await createDesign({
    productType: 'Shirt',
    title: 'AW19',
    userId: user.id
  });
  const designTwo = await createDesign({
    productType: 'Pants',
    title: 'AW19',
    userId: user.id
  });
  const designThree = await createDesign({
    productType: 'Socks',
    title: 'AW19',
    userId: user.id
  });

  const [response, body] = await get(
    `/collaborators?designIds=${design.id},${designTwo.id},${designThree.id}`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 200);
  t.equal(body.length, 2);

  const [rejectedResponse, rejectedBody] = await get(
    `/collaborators?designIds=abc-123,${designTwo.id},${designThree.id}`,
    { headers: authHeader(randomSession.id) }
  );

  t.equal(rejectedResponse.status, 403);
  t.deepEqual(
    rejectedBody.message,
    'You are not allowed to view collaborators for the given designs!'
  );
});

test('GET /collaborators returns a 400 for an invalid collection or design ID', async (t: Test) => {
  const { session } = await createUser();

  const [collectionResponse, collectionBody] = await get(
    '/collaborators?collectionId=d7567ce0-2fe3-404d-b1a4-393b661d5683',
    { headers: authHeader(session.id) }
  );

  t.equal(collectionResponse.status, 400);
  t.equal(collectionBody.message, 'Could not find collection d7567ce0-2fe3-404d-b1a4-393b661d5683');

  const [designResponse, designBody] = await get(
    '/collaborators?designId=d7567ce0-2fe3-404d-b1a4-393b661d5683',
    { headers: authHeader(session.id) }
  );

  t.equal(designResponse.status, 400);
  t.equal(designBody.message, 'Could not find design d7567ce0-2fe3-404d-b1a4-393b661d5683');
});

test('GET /collaborators requires access to the resource you want to access', async (t: Test) => {
  sandbox().stub(EmailService, 'enqueueSend').resolves();
  const { session: maliciousSession, user: maliciousUser } = await createUser();
  const { session: targetSession, user: targetUser } = await createUser();

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: targetUser.id
  });

  await post('/collaborators', {
    body: {
      designId: design.id,
      invitationMessage: "TAke a look, y'all",
      role: 'EDIT',
      userEmail: 'my-private-contact@example.com'
    },
    headers: authHeader(targetSession.id)
  });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: maliciousUser.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'AW19'
  });

  const [response, body] = await get(
    `/collaborators?collectionId=${collection.id}&designId=${design.id}`, {
      headers: authHeader(maliciousSession.id)
    }
  );

  t.equal(response.status, 400);
  t.equal(body.message, 'Must pass only one query parameter at a time!');
});
