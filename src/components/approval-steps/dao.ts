import Knex, { QueryBuilder } from 'knex';

import { omit } from 'lodash';
import { validate, validateEvery } from '../../services/validate-from-db';
import ApprovalStep, {
  ApprovalStepRow,
  dataAdapter,
  isApprovalStepRow,
  partialDataAdapter
} from './domain-object';
import { CalaEvents, emit } from '../../services/pubsub';

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

export async function find(
  trx: Knex.Transaction,
  filter: Partial<ApprovalStep>,
  modifier?: (query: QueryBuilder) => QueryBuilder
): Promise<ApprovalStep[]> {
  const basicQuery = trx(TABLE_NAME)
    .select('*')
    .where(partialDataAdapter.toDb(filter))
    .orderBy('ordering');

  const rows = await (modifier ? basicQuery.modify(modifier) : basicQuery);

  return validateApprovalSteps(rows);
}

export async function findOne(
  trx: Knex.Transaction,
  filter: Partial<ApprovalStep>,
  modifier?: (query: QueryBuilder) => QueryBuilder
): Promise<ApprovalStep> {
  const basicQuery = trx(TABLE_NAME)
    .select('*')
    .where(partialDataAdapter.toDb(filter))
    .orderBy('ordering')
    .first();
  const row = await (modifier ? basicQuery.modify(modifier) : basicQuery);
  return validate<ApprovalStepRow, ApprovalStep>(
    TABLE_NAME,
    isApprovalStepRow,
    dataAdapter,
    row
  );
}

export async function findBySubmissionId(
  trx: Knex.Transaction,
  id: string
): Promise<ApprovalStep | null> {
  return trx(TABLE_NAME)
    .select('design_approval_steps.*')
    .join(
      'design_approval_submissions',
      'design_approval_submissions.step_id',
      'design_approval_steps.id'
    )
    .where({
      'design_approval_submissions.id': id
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

export async function findByDesign(
  trx: Knex.Transaction,
  designId: string
): Promise<ApprovalStep[]> {
  return find(trx, { designId });
}

export async function findById(
  trx: Knex.Transaction,
  id: string
): Promise<ApprovalStep | null> {
  return findOne(trx, { id });
}

export async function update(
  trx: Knex.Transaction,
  id: string,
  patch: Partial<ApprovalStep>
): Promise<ApprovalStep> {
  const patchRow = partialDataAdapter.forInsertion(omit(patch, 'id'));

  const oldStep = await findById(trx, id);
  if (!oldStep) {
    throw new Error('approvalStep nopt found');
  }

  const updated = await trx(TABLE_NAME)
    .where({ id })
    .update(patchRow, '*')
    .then(validateApprovalSteps);

  if (updated.length !== 1) {
    throw new Error('Could not update approval step');
  }
  const approvalStep = updated[0];

  if (oldStep.state !== approvalStep.state) {
    await emit<CalaEvents.ApprovalStepStateChanged>(
      'approvalStep.stateChanged',
      {
        trx,
        approvalStep,
        oldState: oldStep.state
      }
    );
  }

  return approvalStep;
}
