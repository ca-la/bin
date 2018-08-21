import * as tape from 'tape';
import { authHeader, del } from '../../test-helpers/http';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import ProductDesignsDAO = require('../../dao/product-designs');
import ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');

test(
  'DELETE /product-design-collaborators/:id returns 404 if collaborator was already deleted',
  async (t: tape.Test) => {
    const { session, user } = await createUser();
    const design = await ProductDesignsDAO.create({
      productType: 'TEESHIRT',
      title: 'Plain White Tee',
      userId: user.id
    });

    const collaborator = await ProductDesignCollaboratorsDAO.create({
      designId: design.id,
      userEmail: 'person@example.com'
    });

    const [firstResponse] = await del(`/product-design-collaborators/${collaborator.id}`, {
      headers: authHeader(session.id)
    });
    t.equal(firstResponse.status, 204);

    const [secondResponse, body] = await del(`/product-design-collaborators/${collaborator.id}`, {
      headers: authHeader(session.id)
    });
    t.equal(secondResponse.status, 404);
    t.equal(body.message, 'Collaborator not found');
  }
);
