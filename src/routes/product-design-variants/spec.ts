import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { create as createDesign } from '../../dao/product-designs';
import * as API from '../../test-helpers/http';
import { test } from '../../test-helpers/fresh';
import * as ProductDesignVariantsDAO from '../../dao/product-design-variants';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import ProductDesignVariant from '../../domain-objects/product-design-variant';

const API_PATH = '/product-design-variants';

test(`GET ${API_PATH}?designId fetches all variants for a design`, async (t: tape.Test) => {
  const { session, user } = await createUser();
  const { session: sessionTwo, user: userTwo } = await createUser();
  const { session: randomSession } = await createUser();

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });
  await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: 'Come see my cool shirt',
    role: 'VIEW',
    userEmail: null,
    userId: userTwo.id
  });
  const variantOne = await ProductDesignVariantsDAO.create({
    colorName: 'Green',
    designId: design.id,
    id: uuid.v4(),
    position: 0,
    sizeName: 'M',
    unitsToProduce: 123
  });
  const variantTwo = await ProductDesignVariantsDAO.create({
    colorName: 'Yellow',
    designId: design.id,
    id: uuid.v4(),
    position: 1,
    sizeName: 'M',
    unitsToProduce: 100
  });

  const [failedResponse] = await API.get(`${API_PATH}/?designId=${design.id}`, {
    headers: API.authHeader(randomSession.id)
  });
  t.equal(failedResponse.status, 403);

  const [response, body] = await API.get(`${API_PATH}/?designId=${design.id}`, {
    headers: API.authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(
    body.map((variant: ProductDesignVariant): string => variant.id),
    [variantOne.id, variantTwo.id]
  );

  // A collaborator should have access to the variants.
  const [responseTwo, bodyTwo] = await API.get(`${API_PATH}/?designId=${design.id}`, {
    headers: API.authHeader(sessionTwo.id)
  });
  t.equal(responseTwo.status, 200);
  t.deepEqual(
    bodyTwo.map((variant: ProductDesignVariant): string => variant.id),
    [variantOne.id, variantTwo.id]
  );
});

test(`PUT ${API_PATH}?designId replaces all variants for a design`, async (t: tape.Test) => {
  const { session, user } = await createUser();
  const { session: sessionTwo, user: userTwo } = await createUser();
  const { session: randomSession } = await createUser();

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: user.id
  });
  await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: 'Come see my cool shirt',
    role: 'VIEW',
    userEmail: null,
    userId: userTwo.id
  });
  await ProductDesignVariantsDAO.create({
    colorName: 'Green',
    designId: design.id,
    id: uuid.v4(),
    position: 0,
    sizeName: 'M',
    unitsToProduce: 999
  });
  await ProductDesignVariantsDAO.create({
    colorName: 'Yellow',
    designId: design.id,
    id: uuid.v4(),
    position: 1,
    sizeName: 'M',
    unitsToProduce: 1
  });

  const variants = [{
    colorName: 'Green',
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    position: 0,
    sizeName: 'L',
    unitsToProduce: 101
  }, {
    colorName: 'Green',
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    position: 1,
    sizeName: 'M',
    unitsToProduce: 899
  }];

  const [failedResponse] = await API.put(`${API_PATH}/?designId=${design.id}`, {
    body: variants,
    headers: API.authHeader(randomSession.id)
  });
  t.equal(failedResponse.status, 403);

  const [response, body] = await API.put(`${API_PATH}/?designId=${design.id}`, {
    body: variants,
    headers: API.authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(
    body.map((variant: ProductDesignVariant): string => variant.id),
    [variants[0].id, variants[1].id]
  );

  const [responseTwo, bodyTwo] = await API.put(`${API_PATH}/?designId=${design.id}`, {
    body: [],
    headers: API.authHeader(session.id)
  });
  t.equal(responseTwo.status, 200);
  t.deepEqual(bodyTwo, [], 'Returns an empty list');

  // A view collaborator should not have permissions to edit the variants.
  const [responseThree] = await API.put(`${API_PATH}/?designId=${design.id}`, {
    body: variants,
    headers: API.authHeader(sessionTwo.id)
  });
  t.equal(responseThree.status, 403);
});
