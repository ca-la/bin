import * as tape from 'tape';
import { authHeader, del, get } from '../../test-helpers/http';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import ProductDesignsDAO = require('../../dao/product-designs');
import CollaboratorsDAO = require('../../dao/collaborators');

test(
  'DELETE /collaborators/:id returns 404 if collaborator was already deleted',
  async (t: tape.Test) => {
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

test('GET /product-design-collaborators/:id is accessible at the old URL', async (t: tape.Test) => {
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
