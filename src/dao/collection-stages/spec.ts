import * as tape from 'tape';
import { test } from '../../test-helpers/fresh';
import { create, findAllByCollectionId, findById } from './index';
import { create as createCollection } from '../collections';
import createUser = require('../../test-helpers/create-user');

test('Collection Stage DAO supports creation/retrieval', async (t: tape.Test) => {
  const userId = await createUser().then((response: any) => response.user.id);

  const inserted = await Promise.resolve(createCollection({ createdBy: userId }))
  .then((collection: any) => create({ collectionId: collection.id, title: 'test' }));

  const result = await findById(inserted.id);
  t.deepEqual(result, inserted, 'Returned inserted task');
});

test('Collection Stage DAO supports retrieval by collectionId', async (t: tape.Test) => {
  const userId = await createUser().then((response: any) => response.user.id);

  const inserted = await Promise.resolve(createCollection({ createdBy: userId }))
  .then((collection: any) => create({ collectionId: collection.id, title: 'test' }));

  const result = await findAllByCollectionId(inserted.collectionId);
  t.deepEqual(result[0], inserted, 'Returned inserted task');
});
