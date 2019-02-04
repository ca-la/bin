import * as uuid from 'node-uuid';

import * as CollaboratorsDAO from './dao';
import * as CollectionsDAO from '../../dao/collections';
import ProductDesignsDAO = require('../../dao/product-designs');

import createUser = require('../../test-helpers/create-user');
import { test, Test } from '../../test-helpers/fresh';
import createDesign from '../../services/create-design';

test('Collaborators DAO can find all collaborators with a list of ids', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: 'BOMBER',
    title: 'RAF RAF RAF PARKA',
    userId: user.id
  });

  const c1 = await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: 'Come see my cool bomber',
    role: 'EDIT',
    userEmail: null,
    userId: user2.id
  });
  const c2 = await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: 'Come see my cool bomber',
    role: 'EDIT',
    userEmail: 'rick@rickowens.eu',
    userId: null
  });
  await CollaboratorsDAO.deleteById(c2.id);

  t.deepEqual(
    await CollaboratorsDAO.findAllByIds([c1.id, c2.id]),
    [c1],
    'Returns all non-deleted collaborators'
  );
});

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
  t.equal(list[1].id, collaborator.id);
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

  const collaborator = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    user.id
  );

  t.deepEqual(collaborator, null);
});

test('CollaboratorsDAO.update', async (t: Test) => {
  const { user: designer } = await createUser({ withSession: false });
  const { user: friend } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'A product design',
    userId: designer.id
  });
  const collaborator = await CollaboratorsDAO.create({
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: friend.email,
    userId: null
  });

  const validUpdate = await CollaboratorsDAO.update(collaborator.id, {
    role: 'VIEW',
    userEmail: null,
    userId: friend.id
  });
  t.deepEqual(validUpdate, {
    ...collaborator,
    role: 'VIEW',
    user: friend,
    userEmail: null,
    userId: friend.id
  });
  CollaboratorsDAO.update(collaborator.id, {
    collectionId: 'foo',
    designId: 'bar',
    invitationMessage: 'baz'
  })
    .then(() => t.fail('Invalid update succeeded'))
    .catch(() => t.pass('Correctly rejected invalid update'));
});
