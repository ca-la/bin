import CollaboratorsDAO = require('.');
import CollectionsDAO = require('../../dao/collections');

import createUser = require('../../test-helpers/create-user');
import { test, Test } from '../../test-helpers/fresh';

test('CollaboratorsDAO.findByCollection returns colllaborators', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const collection = await CollectionsDAO.create({
    createdBy: user.id,
    title: 'AW19'
  });

  const collaborator = await CollaboratorsDAO.create({
    collectionId: collection.id,
    role: 'EDIT',
    userId: user.id
  });

  const list = await CollaboratorsDAO.findByCollection(collection.id);
  t.equal(list.length, 1);
  t.equal(list[0].id, collaborator.id);
});

test('CollaboratorsDAO.findByCollectionAndUser returns colllaborators', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const collection = await CollectionsDAO.create({
    createdBy: user.id,
    title: 'AW19'
  });

  const collaborator = await CollaboratorsDAO.create({
    collectionId: collection.id,
    role: 'EDIT',
    userId: user.id
  });

  const list = await CollaboratorsDAO.findByCollectionAndUser(
    collection.id,
    user.id
  );

  t.equal(list.length, 1);
  t.equal(list[0].id, collaborator.id);
});