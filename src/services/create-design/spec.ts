import CollaboratorsDAO = require('../../components/collaborators/dao');
import TaskEventsDAO = require('../../dao/task-events');
import StagesDAO = require('../../dao/product-design-stages');
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
  t.equal(collaborators.length, 1, 'There is a collaborator on the new design');
  t.equal(collaborators[0].userId, user.id, 'The collaborator is the user');

  const tasks = await TaskEventsDAO.findByDesignId(design.id);
  t.equal(tasks.length > 0, true, 'There are tasks on the new design');
  t.equal(
    tasks[0].assignees[0].userId,
    user.id,
    'Task is assigned to the user'
  );

  const stages = await StagesDAO.findAllByDesignId(design.id);
  t.equal(stages.length, 2, 'There are stages on the new design');
});
