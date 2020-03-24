import Knex from 'knex';
import * as uuid from 'node-uuid';

import ApprovalStep, {
  ApprovalStepState
} from '../../components/approval-steps/domain-object';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';

export default function createApprovalSteps(
  trx: Knex.Transaction,
  designId: string
): Promise<ApprovalStep[]> {
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

  return ApprovalStepsDAO.createAll(trx, steps);
}
