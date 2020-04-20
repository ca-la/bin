import tape from 'tape';
import { authHeader, get, post } from '../../test-helpers/http';
import createUser from '../../test-helpers/create-user';
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType
} from '../approval-steps/domain-object';
import uuid from 'node-uuid';
import ProductDesignsDAO from '../product-designs/dao';
import { staticProductDesign } from '../../test-helpers/factories/product-design';
import Knex from 'knex';
import ProductDesign from '../product-designs/domain-objects/product-design';
import db from '../../services/db';
import * as ApprovalStepsDAO from '../approval-steps/dao';
import { test } from '../../test-helpers/fresh';
import generateTask from '../../test-helpers/factories/task';
import * as ApprovalStepTaskDAO from './dao';

test('GET /design-approval-step-tasks?approvalStepId returns tasks', async (t: tape.Test) => {
  const { session, user } = await createUser({});

  const design: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );
  const approvalStep: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: design.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT
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

  const [response, body] = await get(
    `/design-approval-step-tasks/?approvalStepId=${approvalStep.id}`,
    {
      headers: authHeader(session.id)
    }
  );

  t.equal(response.status, 200, 'Successfully returns');
  t.equal(body.length, 1);
  t.equal(body[0].createdBy, createdBy.id);
});

test('POST /design-approval-step-task creates a task', async (t: tape.Test) => {
  const { session, user } = await createUser({});

  const design: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );
  const approvalStep: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: design.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT
  };
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [approvalStep])
  );

  const task = {
    createdAt: new Date(),
    id: uuid.v4(),
    title: 'test task',
    createdBy: user.id,
    approvalStepId: approvalStep.id
  };

  const [response, body] = await post(`/design-approval-step-tasks`, {
    headers: authHeader(session.id),
    body: task
  });
  t.equal(response.status, 201, 'Successfully returns');
  t.equal(body.createdBy, user.id);
});
