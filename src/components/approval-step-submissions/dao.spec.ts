import Knex from 'knex';
import * as uuid from 'node-uuid';
import { isEqual } from 'lodash';

import { test, Test } from '../../test-helpers/fresh';
import { staticProductDesign } from '../../test-helpers/factories/product-design';
import * as ProductDesignsDAO from '../product-designs/dao';
import db from '../../services/db';
import ProductDesign from '../product-designs/domain-objects/product-design';
import createUser from '../../test-helpers/create-user';
import ApprovalStep, {
  ApprovalStepState
} from '../approval-steps/domain-object';
import * as ApprovalStepsDAO from '../approval-steps/dao';

import ApprovalStepSubmission, {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState
} from './domain-object';
import * as ApprovalStepSubmissionsDAO from './dao';

test('ApprovalStepSubmissionsDAO can create multiple submissions and retrieve by step', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );

  const as1: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: d1.id
  };
  const as2: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Technical Design',
    ordering: 1,
    designId: d1.id
  };

  const sub1: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
    id: uuid.v4(),
    createdAt: new Date(),
    stepId: as1.id
  };
  const sub2: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
    id: uuid.v4(),
    createdAt: new Date(),
    stepId: as1.id
  };
  const sub3: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
    id: uuid.v4(),
    createdAt: new Date(),
    stepId: as2.id
  };
  const sub4: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
    id: uuid.v4(),
    createdAt: new Date(),
    stepId: as2.id
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

    const found = await ApprovalStepSubmissionsDAO.findByStep(trx, as1.id);

    t.true(
      isEqual(new Set(found), new Set([sub1, sub2])),
      'returns submissions by step'
    );
  });
});
