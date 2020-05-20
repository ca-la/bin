import Knex from "knex";

import { validate, validateEvery } from "../../services/validate-from-db";
import ApprovalStepSubmission, {
  ApprovalStepSubmissionRow,
  dataAdapter,
  isApprovalStepSubmissionRow,
  partialDataAdapter,
} from "./domain-object";

const TABLE_NAME = "design_approval_submissions";

const validateApprovalSubmission = (candidate: any): ApprovalStepSubmission =>
  validate<ApprovalStepSubmissionRow, ApprovalStepSubmission>(
    TABLE_NAME,
    isApprovalStepSubmissionRow,
    dataAdapter,
    candidate
  );

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
    .returning("*")
    .then(validateApprovalSubmissions);
}

export async function findByStep(
  trx: Knex.Transaction,
  stepId: string
): Promise<ApprovalStepSubmission[]> {
  return trx(TABLE_NAME)
    .select("*")
    .where({
      step_id: stepId,
    })
    .orderBy("created_at", "asc")
    .then(validateApprovalSubmissions);
}

export async function findByDesign(
  trx: Knex.Transaction,
  designId: string
): Promise<ApprovalStepSubmission[]> {
  return trx(TABLE_NAME)
    .select("design_approval_submissions.*")
    .join(
      "design_approval_steps",
      "design_approval_steps.id",
      "design_approval_submissions.step_id"
    )
    .where({
      "design_approval_steps.design_id": designId,
    })
    .then(validateApprovalSubmissions);
}

export async function update(
  trx: Knex.Transaction,
  id: string,
  data: Partial<ApprovalStepSubmission>
): Promise<ApprovalStepSubmission> {
  const rowData = partialDataAdapter.forInsertion(data);

  const rows = await trx(TABLE_NAME).where({ id }).update(rowData, "*");

  return validate<ApprovalStepSubmissionRow, ApprovalStepSubmission>(
    TABLE_NAME,
    isApprovalStepSubmissionRow,
    dataAdapter,
    rows[0]
  );
}

export async function findById(
  trx: Knex.Transaction,
  submissionId: string
): Promise<ApprovalStepSubmission | null> {
  return trx(TABLE_NAME)
    .first("*")
    .where({
      id: submissionId,
    })
    .then(validateApprovalSubmission);
}

export async function setAssignee(
  trx: Knex.Transaction,
  submissionId: string,
  collaboratorId: string
): Promise<ApprovalStepSubmission> {
  const subs = await trx(TABLE_NAME)
    .where({ id: submissionId })
    .update(
      {
        collaborator_id: collaboratorId,
      },
      "*"
    )
    .then(validateApprovalSubmissions);

  if (subs.length === 0) {
    throw new Error("Wrong submission id");
  }

  return subs[0];
}
