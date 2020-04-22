import Knex from 'knex';
import uuid from 'node-uuid';
import { authHeader, get, patch, post } from '../../test-helpers/http';
import { test, Test } from '../../test-helpers/fresh';
import createUser from '../../test-helpers/create-user';
import { generateDesign } from '../../test-helpers/factories/product-design';
import db from '../../services/db';
import * as ApprovalStepsDAO from '../approval-steps/dao';
import {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState
} from './domain-object';
import generateApprovalStep from '../../test-helpers/factories/design-approval-step';
import generateApprovalSubmission from '../../test-helpers/factories/design-approval-submission';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import * as NotificationsDAO from '../notifications/dao';

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

test('PATCH /design-approval-step-submissions/:submissionId with collaboratorId', async (t: Test) => {
  const { user: user1, session: session1 } = await createUser();
  const { user: user2, session: session2 } = await createUser();

  const trx = await db.transaction();
  const { approvalStep, design } = await generateApprovalStep(trx, {
    createdBy: user1.id
  });
  const { collaborator: collaborator1 } = await generateCollaborator(
    {
      designId: design.id,
      userId: user1.id
    },
    trx
  );
  const { collaborator: collaborator2 } = await generateCollaborator(
    {
      designId: (await generateDesign({ userId: user2.id })).id,
      userId: user2.id
    },
    trx
  );

  const { submission } = await generateApprovalSubmission(trx, {
    stepId: approvalStep.id
  });
  await trx.commit();

  const [response, body] = await patch(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(session1.id),
      body: {
        collaboratorId: collaborator1.id
      }
    }
  );
  t.is(response.status, 200);
  t.is(body.collaboratorId, collaborator1.id);

  await db.transaction(async (trx2: Knex.Transaction) => {
    const notifications = await NotificationsDAO.findByUserId(trx2, user1.id, {
      limit: 10,
      offset: 0
    });
    t.is(notifications.length, 1);
    t.is(notifications[0].approvalSubmissionId, submission.id);
  });

  const otherRes = await patch(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(session2.id),
      body: {
        collaboratorId: collaborator2.id
      }
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
