import Knex from 'knex';

import { validate, validateEvery } from '../../services/validate-from-db';
import ApprovalStep, {
  ApprovalStepRow,
  dataAdapter,
  isApprovalStepRow,
  partialDataAdapter
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

export async function findById(
  trx: Knex.Transaction,
  id: string
): Promise<ApprovalStep | null> {
  return trx(TABLE_NAME)
    .select('*')
    .where({
      id
    })
    .first()
    .then((candidate: any) =>
      validate<ApprovalStepRow, ApprovalStep>(
        TABLE_NAME,
        isApprovalStepRow,
        dataAdapter,
        candidate
      )
    );
}

export async function update(
  trx: Knex.Transaction,
  data: Partial<ApprovalStep>
): Promise<ApprovalStep> {
  const { id, ...forUpdate } = partialDataAdapter.forInsertion(data);

  const updated = await trx(TABLE_NAME)
    .where({ id })
    .update(forUpdate, '*')
    .then(validateApprovalSteps);

  if (updated.length !== 1) {
    throw new Error('Could not update approval step');
  }

  return updated[0];
}
