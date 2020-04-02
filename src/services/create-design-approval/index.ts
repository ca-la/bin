import Knex from 'knex';
import * as uuid from 'node-uuid';

import ApprovalStep, {
  ApprovalStepState
} from '../../components/approval-steps/domain-object';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import ApprovalSubmission, {
  ApprovalSubmissionArtifactType,
  ApprovalSubmissionState
} from '../../components/approval-submissions/domain-object';
import * as ApprovalSubmissionsDAO from '../../components/approval-submissions/dao';

export default async function createDesignApproval(
  trx: Knex.Transaction,
  designId: string
): Promise<void> {
  const steps: ApprovalStep[] = [
    {
      id: uuid.v4(),
      state: ApprovalStepState.CURRENT,
      title: 'Checkout',
      ordering: 0,
      designId
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: 'Technical Design',
      ordering: 1,
      designId
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: 'Prototype',
      ordering: 2,
      designId
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: 'Production',
      ordering: 3,
      designId
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: 'Shipping',
      ordering: 4,
      designId
    }
  ];

  await ApprovalStepsDAO.createAll(trx, steps);

  const submissions: ApprovalSubmission[] = [
    {
      id: uuid.v4(),
      state: ApprovalSubmissionState.UNSUBMITTED,
      artifactType: ApprovalSubmissionArtifactType.TECHNICAL_DESIGN,
      createdAt: new Date(),
      stepId: steps[1].id
    },
    {
      id: uuid.v4(),
      state: ApprovalSubmissionState.UNSUBMITTED,
      artifactType: ApprovalSubmissionArtifactType.SAMPLE,
      createdAt: new Date(),
      stepId: steps[2].id
    }
  ];

  await ApprovalSubmissionsDAO.createAll(trx, submissions);
}