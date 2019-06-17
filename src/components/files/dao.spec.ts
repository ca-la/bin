import * as uuid from 'node-uuid';

import { test, Test } from '../../test-helpers/fresh';
import * as FilesDAO from './dao';
import createUser = require('../../test-helpers/create-user');

test('FilesDAO returns null if there is no file in the db', async (t: Test) => {
  const randomId = uuid.v4();
  const result = await FilesDAO.findById(randomId);
  t.equal(result, null, 'Returns null if it cannot find a row');
});

test('FilesDAO supports creation', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const id = uuid.v4();
  const created = await FilesDAO.create({
    id,
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    mimeType: 'text/csv',
    name: null,
    uploadCompletedAt: null
  });

  const found = await FilesDAO.findById(id);
  t.deepEqual(
    created,
    {
      id,
      createdAt: new Date('2019-04-20'),
      createdBy: user.id,
      mimeType: 'text/csv',
      name: null,
      uploadCompletedAt: null
    },
    'Returns the newly created row'
  );
  t.deepEqual(created, found, 'Returns the same row');
});

test('FilesDAO supports updating', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const id = uuid.v4();
  await FilesDAO.create({
    id,
    createdAt: new Date('2019-04-20'),
    createdBy: user.id,
    mimeType: 'text/csv',
    name: null,
    uploadCompletedAt: null
  });
  const updated = await FilesDAO.update(id, {
    name: 'foo-bar',
    uploadCompletedAt: new Date('2019-04-21')
  });

  t.deepEqual(
    updated,
    {
      id,
      createdAt: new Date('2019-04-20'),
      createdBy: user.id,
      mimeType: 'text/csv',
      name: 'foo-bar',
      uploadCompletedAt: new Date('2019-04-21')
    },
    'Returns the updated row'
  );
});
