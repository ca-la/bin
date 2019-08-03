import * as uuid from 'node-uuid';
import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import * as CollectionServicesDAO from './index';
import createUser = require('../../test-helpers/create-user');
import { create as createCollection } from '../../components/collections/dao';

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
  const collectionService = await CollectionServicesDAO.create({
    collectionId: collection.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    needsDesignConsulting: true,
    needsFulfillment: true,
    needsPackaging: true
  });

  const result = await CollectionServicesDAO.findById(collectionService.id);
  t.deepEqual(collectionService, result, 'Returned the inserted collection');
});

test('CollectionService DAO supports creation/retrieval of all', async (t: tape.Test) => {
  const { user } = await createUser();
  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });
  const services1 = await CollectionServicesDAO.create({
    collectionId: collection.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    needsDesignConsulting: true,
    needsFulfillment: true,
    needsPackaging: true
  });
  const services2 = await CollectionServicesDAO.create({
    collectionId: collection.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    needsDesignConsulting: true,
    needsFulfillment: true,
    needsPackaging: true
  });

  const services = await CollectionServicesDAO.findAllByCollectionId(
    collection.id
  );

  t.deepEqual(
    services,
    [services1, services2],
    'Returns services, newest first'
  );
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
  const collectionService = await CollectionServicesDAO.create({
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
  const updated = await CollectionServicesDAO.update(
    collectionService.id,
    data
  );
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
  const collectionService = await CollectionServicesDAO.create({
    collectionId: collection.id,
    createdBy: user.id,
    deletedAt: null,
    id: uuid.v4(),
    needsDesignConsulting: true,
    needsFulfillment: true,
    needsPackaging: true
  });

  const result = await CollectionServicesDAO.deleteById(collectionService.id);
  t.notEqual(result.deletedAt, null, 'Successfully deleted one row');

  const gone = await CollectionServicesDAO.findById(collectionService.id);
  t.equal(gone, null, 'Succesfully removed from database');
});
