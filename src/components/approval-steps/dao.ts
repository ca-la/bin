import Knex from 'knex';

import { validateEvery } from '../../services/validate-from-db';
import ApprovalStep, {
  ApprovalStepRow,
  dataAdapter,
  isApprovalStepRow
} from './domain-object';

const TABLE_NAME = 'design_approval_steps';

const validateApprovalSteps = (candidate: any[]): ApprovalStep[] =>
  validateEvery<ApprovalStepRow, ApprovalStep>(
    TABLE_NAME,
    isApprovalStepRow,
    dataAdapter,
    candidate
  );

export async function createAll(
  trx: Knex.Transaction,
  data: ApprovalStep[]
): Promise<ApprovalStep[]> {
  const rowData = data.map(dataAdapter.forInsertion.bind(dataAdapter));
  return trx(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .then(validateApprovalSteps);
}

export async function findByDesign(
  trx: Knex.Transaction,
  designId: string
): Promise<ApprovalStep[]> {
  return trx(TABLE_NAME)
    .select('*')
    .where({
      design_id: designId
    })
    .orderBy('ordering')
    .then(validateApprovalSteps);
}
