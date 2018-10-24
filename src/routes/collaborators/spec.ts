import CollaboratorsDAO = require('../../dao/collaborators');
import CollectionsDAO = require('../../dao/collections');
import createUser = require('../../test-helpers/create-user');
import EmailService = require('../../services/email');
import ProductDesignsDAO = require('../../dao/product-designs');
import { authHeader, del, get, post } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';

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
      designId: design.id,
      userEmail: 'person@example.com'
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
    createdBy: user.id,
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

test('GET /collaborators allows querying by collection ID', async (t: Test) => {
  sandbox().stub(EmailService, 'enqueueSend').resolves();
  const { session, user } = await createUser();

  const collection = await CollectionsDAO.create({
    createdBy: user.id,
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
