import Knex from 'knex';
import * as uuid from 'node-uuid';
import { isEqual } from 'lodash';

import { test, Test } from '../../test-helpers/fresh';
import { staticProductDesign } from '../../test-helpers/factories/product-design';
import generateApprovalSubmission from '../../test-helpers/factories/design-approval-submission';
import generateApprovalStep from '../../test-helpers/factories/design-approval-step';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import * as ProductDesignsDAO from '../product-designs/dao';
import db from '../../services/db';
import ProductDesign from '../product-designs/domain-objects/product-design';
import createUser from '../../test-helpers/create-user';
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType
} from '../approval-steps/domain-object';
import * as ApprovalStepsDAO from '../approval-steps/dao';

import ApprovalStepSubmission, {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState
} from './domain-object';
import * as ApprovalStepSubmissionsDAO from './dao';

test('ApprovalStepSubmissionsDAO can create multiple submissions and retrieve by step and id', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );

  const as1: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null
  };
  const as2: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Technical Design',
    ordering: 1,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.TECHNICAL_DESIGN,
    collaboratorId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null
  };

  const sub1: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
    id: uuid.v4(),
    createdAt: new Date(),
    stepId: as1.id,
    collaboratorId: null,
    title: 'Technical Design'
  };
  const sub2: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
    id: uuid.v4(),
    createdAt: new Date(),
    stepId: as1.id,
    collaboratorId: null,
    title: 'Technical Design'
  };
  const sub3: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
    id: uuid.v4(),
    createdAt: new Date(),
    stepId: as2.id,
    collaboratorId: null,
    title: 'Technical Design'
  };
  const sub4: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
    id: uuid.v4(),
    createdAt: new Date(),
    stepId: as2.id,
    collaboratorId: null,
    title: 'Technical Design'
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    await ApprovalStepsDAO.createAll(trx, [as1, as2]);
    const created = await ApprovalStepSubmissionsDAO.createAll(trx, [
      sub1,
      sub2,
      sub3,
      sub4
    ]);

    t.deepEqual(
      created,
      [sub1, sub2, sub3, sub4],
      'returns inserted submissions'
    );

    const foundByStep = await ApprovalStepSubmissionsDAO.findByStep(
      trx,
      as1.id
    );

    t.true(
      isEqual(new Set(foundByStep), new Set([sub1, sub2])),
      'returns submissions by step'
    );

    const foundById = await ApprovalStepSubmissionsDAO.findById(trx, sub1.id);

    t.true(isEqual(foundById, sub1), 'returns submission by id');
  });
});

test('setAssignee sets the collaborator and returns result', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    const { approvalStep, design } = await generateApprovalStep(trx);
    const { submission } = await generateApprovalSubmission(trx, {
      stepId: approvalStep.id
    });
    const { collaborator } = await generateCollaborator(
      {
        designId: design.id,
        userId: user.id
      },
      trx
    );
    const updated = await ApprovalStepSubmissionsDAO.setAssignee(
      trx,
      submission.id,
      collaborator.id
    );

    t.isEqual(
      updated.collaboratorId,
      collaborator.id,
      'setAssignee returns patched submission'
    );
  });
});

test('supports update', async (t: Test) => {
  await db.transaction(async (trx: Knex.Transaction) => {
    const { approvalStep } = await generateApprovalStep(trx);
    const { submission } = await generateApprovalSubmission(trx, {
      stepId: approvalStep.id,
      state: ApprovalStepSubmissionState.SUBMITTED
    });
    const updated = await ApprovalStepSubmissionsDAO.update(
      trx,
      submission.id,
      { state: ApprovalStepSubmissionState.APPROVED }
    );
    t.isEqual(
      updated.state,
      ApprovalStepSubmissionState.APPROVED,
      'state is updated'
    );
  });
});
