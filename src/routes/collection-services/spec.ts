import * as tape from 'tape';
import * as uuid from 'node-uuid';
import createUser = require('../../test-helpers/create-user');
import { authHeader, del, get, patch, put } from '../../test-helpers/http';
import { test } from '../../test-helpers/fresh';
import { create as createCollection } from '../../dao/collections';
import * as CollectionServiceDAO from '../../dao/collection-services';
import CollectionService from '../../domain-objects/collection-service';

const API_PATH = '/collection-services';

test(`PUT ${API_PATH}/:collectionServiceId creates a CollectionService`, async (t: tape.Test) => {
  const { session, user } = await createUser();

  const collectionServiceId = uuid.v4();
  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });
  const data = {
    collectionId: collection.id,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    deletedAt: null,
    id: collectionServiceId,
    needsDesignConsulting: true,
    needsFulfillment: true,
    needsPackaging: true
  };

  const [response, body] = await put(`${API_PATH}/${collectionServiceId}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 201);
  t.deepEqual(body, data);
});

test(`PATCH ${API_PATH}/:collectionServiceId updates a CollectionService`, async (t: tape.Test) => {
  const { session, user } = await createUser();
  const collectionServiceId = uuid.v4();

  const collection = await createCollection({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: null,
    id: uuid.v4(),
    title: 'FW19'
  });
  const collectionService = await CollectionServiceDAO.create({
    collectionId: collection.id,
    createdBy: user.id,
    deletedAt: null,
    id: collectionServiceId,
    needsDesignConsulting: false,
    needsFulfillment: false,
    needsPackaging: false
  });
  const data = {
    collectionId: collection.id,
    createdAt: 'something completely invalid',
    createdBy: 'not a user id.',
    deletedAt: 'also really invalid',
    id: collectionService.id,
    needsDesignConsulting: true,
    needsFulfillment: false,
    needsPackaging: true
  };

  const [response, body] = await patch(`${API_PATH}/${collectionServiceId}`, {
    body: data,
    headers: authHeader(session.id)
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    ...data,
    createdAt: collectionService.createdAt.toISOString(),
    createdBy: collectionService.createdBy,
    deletedAt: collectionService.deletedAt
  });
});

test(
  `DELETE ${API_PATH}/:collectionServiceId deletes a CollectionService`,
  async (t: tape.Test) => {
    const { session, user } = await createUser();
    const collectionServiceId = uuid.v4();
    const collection = await createCollection({
      createdAt: new Date(),
      createdBy: user.id,
      deletedAt: null,
      description: null,
      id: uuid.v4(),
      title: 'FW19'
    });

    await CollectionServiceDAO.create({
      collectionId: collection.id,
      createdBy: user.id,
      deletedAt: null,
      id: collectionServiceId,
      needsDesignConsulting: true,
      needsFulfillment: true,
      needsPackaging: true
    });

    const [response] = await del(`${API_PATH}/${collectionServiceId}`, {
      headers: authHeader(session.id)
    });
    t.equal(response.status, 204);
  }
);

test(
  `GET ${API_PATH}/?collectionId=:collectionId returns CollectionServices`,
  async (t: tape.Test) => {
    const { session, user } = await createUser();
    const collectionServiceIdOne = uuid.v4();
    const collectionServiceIdTwo = uuid.v4();

    const collection = await createCollection({
      createdAt: new Date(),
      createdBy: user.id,
      deletedAt: null,
      description: null,
      id: uuid.v4(),
      title: 'FW19'
    });

    const serviceOne = await CollectionServiceDAO.create({
      collectionId: collection.id,
      createdBy: user.id,
      deletedAt: null,
      id: collectionServiceIdOne,
      needsDesignConsulting: true,
      needsFulfillment: true,
      needsPackaging: true
    });
    const serviceTwo = await CollectionServiceDAO.create({
      collectionId: collection.id,
      createdBy: user.id,
      deletedAt: null,
      id: collectionServiceIdTwo,
      needsDesignConsulting: false,
      needsFulfillment: true,
      needsPackaging: false
    });

    const [response, body] = await get(`${API_PATH}/?collectionId=${collection.id}`, {
      headers: authHeader(session.id)
    });
    t.equal(response.status, 200);
    t.deepEqual(
      body.map((service: CollectionService): string => service.id),
      [serviceOne.id, serviceTwo.id]
    );
  }
);

test(`GET ${API_PATH}/ without a collectionId fails`, async (t: tape.Test) => {
  const { session } = await createUser();
  const [response] = await get(`${API_PATH}/`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 400);
});
