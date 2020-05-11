import Knex from 'knex';
import * as uuid from 'node-uuid';

import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType
} from '../../components/approval-steps/domain-object';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';

export default async function createDesignApproval(
  trx: Knex.Transaction,
  designId: string
): Promise<void> {
  const now = new Date();
  const steps: ApprovalStep[] = [
    {
      id: uuid.v4(),
      state: ApprovalStepState.CURRENT,
      title: 'Checkout',
      ordering: 0,
      designId,
      reason: null,
      type: ApprovalStepType.CHECKOUT,
      collaboratorId: null,
      createdAt: now,
      startedAt: now,
      completedAt: null
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.BLOCKED,
      title: 'Technical Design',
      ordering: 1,
      designId,
      reason: 'Pending technical partner pairing',
      type: ApprovalStepType.TECHNICAL_DESIGN,
      collaboratorId: null,
      createdAt: now,
      startedAt: null,
      completedAt: null
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.BLOCKED,
      title: 'Sample',
      ordering: 2,
      designId,
      reason: 'Pending production partner pairing',
      type: ApprovalStepType.SAMPLE,
      collaboratorId: null,
      createdAt: now,
      startedAt: null,
      completedAt: null
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: 'Production',
      ordering: 3,
      designId,
      reason: null,
      type: ApprovalStepType.PRODUCTION,
      collaboratorId: null,
      createdAt: now,
      startedAt: null,
      completedAt: null
    }
  ];

  await ApprovalStepsDAO.createAll(trx, steps);
}
