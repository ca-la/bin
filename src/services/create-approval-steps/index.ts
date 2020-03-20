import Knex from 'knex';
import * as uuid from 'node-uuid';
import db from '../db';

import ApprovalStep from '../../components/approval-steps/domain-object';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';

export default function createApprovalSteps(
  designId: string
): Promise<ApprovalStep> {
  return db.transaction((trx: Knex.Transaction) => {
    const steps: ApprovalStep[] = [
      { id: uuid.v4(), title: 'Checkout', ordering: 0, designId },
      { id: uuid.v4(), title: 'Technical Design', ordering: 1, designId },
      { id: uuid.v4(), title: 'Prototype', ordering: 2, designId },
      { id: uuid.v4(), title: 'Production', ordering: 3, designId },
      { id: uuid.v4(), title: 'Shipping', ordering: 4, designId }
    ];

    return ApprovalStepsDAO.createAll(trx, steps);
  });
}
