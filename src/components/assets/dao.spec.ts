import * as uuid from 'node-uuid';

import { test, Test } from '../../test-helpers/fresh';
import * as AssetsDAO from './dao';
import createUser = require('../../test-helpers/create-user');

test('AssetsDAO returns null if there is no file in the db', async (t: Test) => {
  const randomId = uuid.v4();
  const result = await AssetsDAO.findById(randomId);
  t.equal(result, null, 'Returns null if it cannot find a row');
});

test('AssetsDAO supports creation', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const id = uuid.v4();
  const created = await AssetsDAO.create({
    createdAt: new Date('2019-04-20'),
    deletedAt: null,
    description: null,
    id,
    mimeType: 'text/csv',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: 'my hawt jawnz list',
    uploadCompletedAt: null,
    userId: user.id
  });

  const found = await AssetsDAO.findById(id);
  t.deepEqual(
    created,
    {
      createdAt: new Date('2019-04-20'),
      deletedAt: null,
      description: null,
      id,
      mimeType: 'text/csv',
      originalHeightPx: 0,
      originalWidthPx: 0,
      title: 'my hawt jawnz list',
      uploadCompletedAt: null,
      userId: user.id
    },
    'Returns the newly created row'
  );
  t.deepEqual(created, found, 'Returns the same row');
});

test('AssetsDAO supports updating', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const id = uuid.v4();
  await AssetsDAO.create({
    createdAt: new Date('2019-04-20'),
    deletedAt: null,
    description: null,
    id,
    mimeType: 'text/csv',
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: 'my hawt jawnz list',
    uploadCompletedAt: null,
    userId: user.id
  });
  const updated = await AssetsDAO.update(id, {
    title: 'foo-bar',
    uploadCompletedAt: new Date('2019-04-21')
  });

  t.deepEqual(
    updated,
    {
      createdAt: new Date('2019-04-20'),
      deletedAt: null,
      description: null,
      id,
      mimeType: 'text/csv',
      originalHeightPx: 0,
      originalWidthPx: 0,
      title: 'foo-bar',
      uploadCompletedAt: new Date('2019-04-21'),
      userId: user.id
    },
    'Returns the updated row'
  );
});
