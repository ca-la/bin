import Knex from 'knex';

import { validateEvery } from '../../services/validate-from-db';
import ApprovalSubmission, {
  ApprovalSubmissionRow,
  dataAdapter,
  isApprovalSubmissionRow
} from './domain-object';

const TABLE_NAME = 'design_approval_submissions';

const validateApprovalSubmissions = (candidate: any[]): ApprovalSubmission[] =>
  validateEvery<ApprovalSubmissionRow, ApprovalSubmission>(
    TABLE_NAME,
    isApprovalSubmissionRow,
    dataAdapter,
    candidate
  );

export async function createAll(
  trx: Knex.Transaction,
  data: ApprovalSubmission[]
): Promise<ApprovalSubmission[]> {
  const rowData = data.map(dataAdapter.forInsertion.bind(dataAdapter));
  return trx(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .then(validateApprovalSubmissions);
}

export async function findByStep(
  trx: Knex.Transaction,
  stepId: string
): Promise<ApprovalSubmission[]> {
  return trx(TABLE_NAME)
    .select('*')
    .where({
      step_id: stepId
    })
    .then(validateApprovalSubmissions);
}
