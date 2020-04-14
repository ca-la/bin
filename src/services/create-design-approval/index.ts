import Knex from 'knex';
import * as uuid from 'node-uuid';

import ApprovalStep, {
  ApprovalStepState
} from '../../components/approval-steps/domain-object';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import ApprovalStepSubmission, {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState
} from '../../components/approval-step-submissions/domain-object';
import * as ApprovalStepSubmissionsDAO from '../../components/approval-step-submissions/dao';

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
      designId,
      reason: null
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: 'Technical Design',
      ordering: 1,
      designId,
      reason: null
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: 'Sample',
      ordering: 2,
      designId,
      reason: null
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: 'Production',
      ordering: 3,
      designId,
      reason: null
    }
  ];

  await ApprovalStepsDAO.createAll(trx, steps);

  const submissions: ApprovalStepSubmission[] = [
    {
      id: uuid.v4(),
      state: ApprovalStepSubmissionState.UNSUBMITTED,
      artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
      createdAt: new Date(),
      stepId: steps[1].id
    },
    {
      id: uuid.v4(),
      state: ApprovalStepSubmissionState.UNSUBMITTED,
      artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
      createdAt: new Date(),
      stepId: steps[2].id
    }
  ];

  await ApprovalStepSubmissionsDAO.createAll(trx, submissions);
}
