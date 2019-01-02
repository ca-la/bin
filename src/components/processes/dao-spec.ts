import * as tape from 'tape';
import * as uuid from 'node-uuid';
import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import * as ProcessesDAO from './dao';

test('Processes DAO supports creation and retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const pId = uuid.v4();
  const createdProcess = await ProcessesDAO.create({
    createdBy: user.id,
    id: pId,
    name: 'Dye Sublimation'
  });
  const foundProcess = await ProcessesDAO.findById(pId);

  t.deepEqual(createdProcess.name, 'Dye Sublimation', 'Name is returned as submitted.');
  t.deepEqual(createdProcess.id, pId, 'The same id is returned.');
  t.deepEqual(createdProcess.createdBy, user.id, 'The same user is returned');
  t.deepEqual(createdProcess, foundProcess, 'Creating and finding returns the same instance.');
});
