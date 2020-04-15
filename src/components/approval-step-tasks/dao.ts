import Knex from 'knex';

import ApprovalStepTask, {
  ApprovalStepTaskRow,
  dataAdapter,
  isApprovalStepTaskRow
} from './domain-object';
import { validate } from '../../services/validate-from-db';

const TABLE_NAME = 'design_approval_step_tasks';

export async function create(
  trx: Knex.Transaction,
  data: ApprovalStepTask
): Promise<ApprovalStepTask> {
  const rowData = dataAdapter.forInsertion(data);
  const approvalStepTasks: ApprovalStepTaskRow[] = await trx(TABLE_NAME)
    .insert(rowData)
    .returning('*');

  const approvalStepTask = approvalStepTasks[0];

  if (!approvalStepTask) {
    throw new Error('There was a problem saving the task');
  }

  return validate<ApprovalStepTaskRow, ApprovalStepTask>(
    TABLE_NAME,
    isApprovalStepTaskRow,
    dataAdapter,
    approvalStepTask
  );
}
