import Knex from 'knex';
import * as uuid from 'node-uuid';

import { test, Test } from '../../test-helpers/fresh';
import { staticProductDesign } from '../../test-helpers/factories/product-design';
import * as ProductDesignsDAO from '../product-designs/dao';
import db from '../../services/db';
import ProductDesign from '../product-designs/domain-objects/product-design';

import ApprovalStep, {
  ApprovalStepState
} from '../approval-steps/domain-object';
import * as ApprovalStepsDAO from '../approval-steps/dao';
import * as ApprovalStepTaskDAO from './dao';
import createUser from '../../test-helpers/create-user';
import generateTask from '../../test-helpers/factories/task';
import { findByApprovalStepId } from '../../dao/task-events';

test('ApprovalStepTasksDAO can create multiple tasks and retrieve by step', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );

  const approvalStep: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: d1.id
  };
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [approvalStep])
  );

  const { task, createdBy } = await generateTask();
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepTaskDAO.create(trx, {
      taskId: task.id,
      approvalStepId: approvalStep.id
    })
  );

  const found = await findByApprovalStepId(approvalStep.id);

  t.equal(found.length, 1, 'tasks are returned');
  t.equal(found[0].createdBy, createdBy.id, 'createdBy set to proper user');
  t.equal(found[0].design.id, d1.id, 'includes design');
});