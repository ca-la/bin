import * as uuid from 'node-uuid';
import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, deleteById, findById, update } from './index';
import createUser = require('../../test-helpers/create-user');
import { create as createCollection } from '../collections';

test('CollectionService DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser();
  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });
  const collectionService = await create({
    collectionId: collection.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    needsDesignConsulting: true,
    needsFulfillment: true,
    needsPackaging: true
  });

  const result = await findById(collectionService.id);
  t.deepEqual(collectionService, result, 'Returned the inserted collection');
});

test('CollectionService DAO supports updating', async (t: tape.Test) => {
  const { user } = await createUser();
  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });
  const collectionService = await create({
    collectionId: collection.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    needsDesignConsulting: true,
    needsFulfillment: false,
    needsPackaging: true
  });
  const data = {
    collectionId: collection.id,
    createdAt: collectionService.createdAt,
    createdBy: user.id,
    deletedAt: null,
    id: collectionService.id,
    needsDesignConsulting: false,
    needsFulfillment: false,
    needsPackaging: false
  };
  const updated = await update(collectionService.id, data);
  t.deepEqual(
    updated,
    {
      ...collectionService,
      ...data
    },
    'Succesfully updated the collection service'
  );
});

test('CollectionService DAO supports deletion', async (t: tape.Test) => {
  const { user } = await createUser();
  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });
  const collectionService = await create({
    collectionId: collection.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    needsDesignConsulting: true,
    needsFulfillment: true,
    needsPackaging: true
  });
  const result = await deleteById(collectionService.id);
  t.notEqual(result.deletedAt, null, 'Successfully deleted one row');
  t.equal(await findById(collectionService.id), null, 'Succesfully removed from database');
});
