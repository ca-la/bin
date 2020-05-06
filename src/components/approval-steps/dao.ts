import Knex, { QueryBuilder } from 'knex';

import { omit } from 'lodash';
import { validate, validateEvery } from '../../services/validate-from-db';
import { CalaEvents, emit } from '../../services/pubsub';
import ApprovalStep, {
  ApprovalStepRow,
  dataAdapter,
  isApprovalStepRow,
  partialDataAdapter,
  ApprovalStepState
} from './domain-object';
import ResourceNotFoundError from '../../errors/resource-not-found';

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

interface ApprovalStepUpdateResult {
  before: ApprovalStep;
  updated: ApprovalStep;
}

export async function update(
  trx: Knex.Transaction,
  id: string,
  patch: Partial<ApprovalStep>
): Promise<ApprovalStepUpdateResult> {
  const before = await findById(trx, id);
  if (!before) {
    throw new ResourceNotFoundError('Could not find ApprovalStep');
  }

  const now = new Date();
  let completedAt = null;
  let startedAt = null;
  if (patch.state === ApprovalStepState.CURRENT) {
    startedAt = now;
  }
  if (patch.state === ApprovalStepState.COMPLETED) {
    startedAt = before.startedAt || now;
    completedAt = now;
  }

  const patchRow = partialDataAdapter.forInsertion(
    omit({ ...patch, startedAt, completedAt }, 'id')
  );

  const updated = await trx(TABLE_NAME)
    .where({ id })
    .update(patchRow, '*')
    .then(validateApprovalSteps);

  if (updated.length !== 1) {
    throw new Error('Could not update ApprovalStep');
  }
  const approvalStep = updated[0];
  if (before.state !== approvalStep.state) {
    await emit<CalaEvents.DaoUpdatedApprovalStepState>(
      'dao.updated.approvalStep.state',
      {
        trx,
        updated: approvalStep,
        before
      }
    );
  }

  return {
    before,
    updated: approvalStep
  };
}
