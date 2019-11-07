import * as uuid from 'node-uuid';

import * as CollaboratorsDAO from '../../collaborators/dao';
import * as CollectionsDAO from '../dao';
import * as ProductDesignsDAO from '../../product-designs/dao';
import * as API from '../../../test-helpers/http';
import { sandbox, test, Test } from '../../../test-helpers/fresh';
import createUser = require('../../../test-helpers/create-user');
import generateCollaborator from '../../../test-helpers/factories/collaborator';
import generateCollection from '../../../test-helpers/factories/collection';
import { generateDesign } from '../../../test-helpers/factories/product-design';
import ProductDesign = require('../../product-designs/domain-objects/product-design');

test('PUT + DEL /collections/:id/designs supports moving many designs to from/the collection', async (t: Test) => {
  const { user, session } = await createUser();
  const { collection: c1 } = await generateCollection({ createdBy: user.id });
  const d1 = await generateDesign({
    createdAt: new Date('2019-04-20'),
    userId: user.id
  });
  const d2 = await generateDesign({
    createdAt: new Date('2019-04-21'),
    userId: user.id
  });
  const d3 = await generateDesign({
    createdAt: new Date('2019-04-22'),
    userId: user.id
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ','
    )}`,
    {
      headers: API.authHeader(session.id)
    }
  );

  t.equal(response1.status, 200);
  t.deepEqual(body1.map((design: ProductDesign) => design.id), [
    d3.id,
    d2.id,
    d1.id
  ]);

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(',')}`,
    {
      headers: API.authHeader(session.id)
    }
  );

  t.equal(response2.status, 200);
  t.deepEqual(body2.map((design: ProductDesign) => design.id), [d2.id]);
});

test('PUT + DEL /collections/:id/designs without collection-level access', async (t: Test) => {
  const { user, session } = await createUser();
  const { user: user2 } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({ createdBy: user2.id });
  const d1 = await generateDesign({
    createdAt: new Date('2019-04-20'),
    userId: user.id
  });
  const d2 = await generateDesign({
    createdAt: new Date('2019-04-21'),
    userId: user.id
  });
  const d3 = await generateDesign({
    createdAt: new Date('2019-04-22'),
    userId: user.id
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ','
    )}`,
    {
      headers: API.authHeader(session.id)
    }
  );

  t.equal(response1.status, 403);
  t.equal(body1.message, "You don't have permission to view this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(',')}`,
    {
      headers: API.authHeader(session.id)
    }
  );

  t.equal(response2.status, 403);
  t.equal(body2.message, "You don't have permission to view this collection");
});

test('PUT + DEL /collections/:id/designs without designs', async (t: Test) => {
  const { user, session } = await createUser();
  const { collection: c1 } = await generateCollection({ createdBy: user.id });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=`,
    {
      headers: API.authHeader(session.id)
    }
  );

  t.equal(response1.status, 400);
  t.equal(body1.message, 'designIds is a required query parameter.');

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=`,
    {
      headers: API.authHeader(session.id)
    }
  );

  t.equal(response2.status, 400);
  t.equal(body2.message, 'designIds is a required query parameter.');
});

test('PUT /collections/:id/designs/:id', async (t: Test) => {
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

test('DELETE /collections/:id/designs/:id', async (t: Test) => {
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

test('GET /collections/:id/designs', async (t: Test) => {
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
