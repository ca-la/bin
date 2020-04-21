import Knex from 'knex';
import uuid from 'node-uuid';
import { authHeader, get, post } from '../../test-helpers/http';
import { test, Test } from '../../test-helpers/fresh';
import createUser from '../../test-helpers/create-user';
import { generateDesign } from '../../test-helpers/factories/product-design';
import db from '../../services/db';
import * as ApprovalStepsDAO from '../approval-steps/dao';
import {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState
} from './domain-object';

test('GET /design-approval-step-submissions?stepId=:stepId', async (t: Test) => {
  const designer = await createUser();
  const admin = await createUser({ role: 'ADMIN' });
  const other = await createUser();

  const d1 = await generateDesign({ userId: designer.user.id });

  const steps = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, d1.id)
  );
  const [response, body] = await get(
    `/design-approval-step-submissions?stepId=${steps[1].id}`,
    {
      headers: authHeader(designer.session.id)
    }
  );

  t.is(response.status, 200);
  t.is(body.length, 1);
  t.is(body[0].artifactType, 'TECHNICAL_DESIGN');
  t.is(body[0].state, 'UNSUBMITTED');

  const adminRes = await get(
    `/design-approval-step-submissions?stepId=${steps[1].id}`,
    {
      headers: authHeader(admin.session.id)
    }
  );

  t.is(adminRes[0].status, 200);
  t.is(adminRes[1].length, 1);

  const otherRes = await get(
    `/design-approval-step-submissions?stepId=${steps[1].id}`,
    {
      headers: authHeader(other.session.id)
    }
  );

  t.is(otherRes[0].status, 403);
});

test('POST /design-approval-step-submissions?stepId=:stepId', async (t: Test) => {
  const designer = await createUser();

  const d1 = await generateDesign({ userId: designer.user.id });
  const steps = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, d1.id)
  );
  const [response, body] = await post(
    `/design-approval-step-submissions?stepId=${steps[1].id}`,
    {
      headers: authHeader(designer.session.id),
      body: {
        id: uuid.v4(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        title: 'Submarine'
      }
    }
  );

  t.is(response.status, 200);
  t.is(body.title, 'Submarine');
  t.is(body.state, 'UNSUBMITTED');
  t.is(body.stepId, steps[1].id);
});
