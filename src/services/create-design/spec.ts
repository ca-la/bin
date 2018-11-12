import CollaboratorsDAO = require('../../dao/collaborators');
import createDesign from './index';
import createUser = require('../../test-helpers/create-user');
import { test, Test } from '../../test-helpers/fresh';

test('createDesign service creates a collaborator', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'A brand new design',
    userId: user.id
  });

  const collaborators = await CollaboratorsDAO.findByDesign(design.id);
  t.equal(collaborators.length, 1);
  t.equal(collaborators[0].userId, user.id);
});
