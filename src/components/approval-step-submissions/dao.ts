import Knex from 'knex';

import { validateEvery } from '../../services/validate-from-db';
import ApprovalStepSubmission, {
  ApprovalStepSubmissionRow,
  dataAdapter,
  isApprovalStepSubmissionRow
} from './domain-object';

const TABLE_NAME = 'design_approval_submissions';

const validateApprovalSubmissions = (
  candidate: any[]
): ApprovalStepSubmission[] =>
  validateEvery<ApprovalStepSubmissionRow, ApprovalStepSubmission>(
    TABLE_NAME,
    isApprovalStepSubmissionRow,
    dataAdapter,
    candidate
  );

export async function createAll(
  trx: Knex.Transaction,
  data: ApprovalStepSubmission[]
): Promise<ApprovalStepSubmission[]> {
  const rowData = data.map(dataAdapter.forInsertion.bind(dataAdapter));
  return trx(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .then(validateApprovalSubmissions);
}

export async function findByStep(
  trx: Knex.Transaction,
  stepId: string
): Promise<ApprovalStepSubmission[]> {
  return trx(TABLE_NAME)
    .select('*')
    .where({
      step_id: stepId
    })
    .then(validateApprovalSubmissions);
}
