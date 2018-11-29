import * as uuid from 'node-uuid';
import CollaboratorsDAO = require('.');
import CollectionsDAO = require('../../dao/collections');
import ProductDesignsDAO = require('../../dao/product-designs');

import createUser = require('../../test-helpers/create-user');
import { test, Test } from '../../test-helpers/fresh';
import createDesign from '../../services/create-design';

test('CollaboratorsDAO.findByDesign returns collaborators', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const data = await createUser({ withSession: false });
  const user2 = data.user;

  const design = await createDesign({
    productType: 'BOMBER',
    title: 'AW19',
    userId: user.id
  });

  const collaborator = await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user2.id
  });

  const list = await CollaboratorsDAO.findByDesign(design.id);
  t.equal(list.length, 2);
  t.equal(list[0].id, collaborator.id);
});

test('CollaboratorsDAO.create throws invalid data error', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const invalidId = uuid.v4();
  const design = await createDesign({
    productType: 'BOMBER',
    title: 'AW19',
    userId: user.id
  });

  await CollaboratorsDAO.create({
    collectionId: null,
    designId: invalidId,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  })
  .then(() => t.fail('Expected error'))
  .catch((err: Error) => {
    t.equal(err.message, `Invalid design ID: ${invalidId}`);
  });
  await CollaboratorsDAO.create({
    collectionId: invalidId,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  })
  .then(() => t.fail('Expected error'))
  .catch((err: Error) => {
    t.equal(err.message, `Invalid collection ID: ${invalidId}`);
  });
  await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: invalidId
  })
  .then(() => t.fail('Expected error'))
  .catch((err: Error) => {
    t.equal(err.message, `Invalid user ID: ${invalidId}`);
  });
});

test('CollaboratorsDAO.findByDesign returns collection collaborators', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const data = await createUser({ withSession: false });
  const user2 = data.user;

  const design = await createDesign({
    productType: 'BOMBER',
    title: 'AW19',
    userId: user.id
  });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: '',
    id: uuid.v4(),
    title: 'AW19'
  });

  await CollectionsDAO.addDesign(collection.id, design.id);

  const collaborator = await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user2.id
  });

  const list = await CollaboratorsDAO.findByDesign(design.id);
  t.equal(list.length, 2);
  t.equal(list[1].id, collaborator.id);
});

test('CollaboratorsDAO.findByCollection returns collaborators', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });

  const collaborator = await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const list = await CollaboratorsDAO.findByCollection(collection.id);
  t.equal(list.length, 1);
  t.equal(list[0].id, collaborator.id);
});

test('CollaboratorsDAO.findByCollectionAndUser returns collaborators', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'Initial commit',
    id: uuid.v4(),
    title: 'Drop 001/The Early Years'
  });

  const collaborator = await CollaboratorsDAO.create({
    collectionId: collection.id,
    designId: null,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  const list = await CollaboratorsDAO.findByCollectionAndUser(
    collection.id,
    user.id
  );

  t.equal(list.length, 1);
  t.equal(list[0].id, collaborator.id);
});

test('CollaboratorsDAO.deleteByDesignIdAndUserId deletes collaborator', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'A product design',
    userId: user.id
  });

  await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: user.id
  });

  await CollaboratorsDAO.deleteByDesignAndUser(
    design.id,
    user.id
  );

  const list = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    user.id
  );

  t.deepEqual(list, []);
});
