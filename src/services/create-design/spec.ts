import Knex from 'knex';

import * as CollaboratorsDAO from '../../components/collaborators/dao';
import * as TaskEventsDAO from '../../dao/task-events';
import * as StagesDAO from '../../dao/product-design-stages';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import * as ApprovalSubmissionsDAO from '../../components/approval-submissions/dao';
import createDesign from './index';
import db from '../db';
import createUser from '../../test-helpers/create-user';
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

  const approvalSteps = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, design.id)
  );
  t.equal(approvalSteps.length, 5, 'There are steps on the new design');

  const technicalDesignSubmissions = await db.transaction(
    (trx: Knex.Transaction) =>
      ApprovalSubmissionsDAO.findByStep(trx, approvalSteps[1].id)
  );
  t.equal(
    technicalDesignSubmissions.length,
    1,
    'There is a technical design submission'
  );

  const prototypeSubmissions = await db.transaction((trx: Knex.Transaction) =>
    ApprovalSubmissionsDAO.findByStep(trx, approvalSteps[2].id)
  );
  t.equal(prototypeSubmissions.length, 1, 'There is a prototype submission');
});
